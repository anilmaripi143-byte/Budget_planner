import csv
import io
import re
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.transaction import Transaction, MerchantRule
from app.schemas.transaction import CsvPreviewItem, CsvImportPreviewResponse
from app.services.categorization import classify_merchant

class CsvImporter:
    @staticmethod
    def parse_indian_date(date_str: str) -> str:
        """Parses common Indian bank statement date strings into YYYY-MM-DD."""
        clean = date_str.strip()
        # Common patterns: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
            "%Y-%m-%d", "%d %b %Y", "%d-%b-%Y", "%d %B %Y"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(clean, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        # Fallback to today
        return datetime.now().strftime("%Y-%m-%d")

    @classmethod
    def generate_dedup_hash(cls, date_str: str, amount: float, direction: str, description: str) -> str:
        clean_desc = re.sub(r'[^a-zA-Z0-9]', '', description.lower())[:30]
        raw = f"{date_str}_{amount:.2f}_{direction}_{clean_desc}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:24]

    @classmethod
    def preview_csv_content(
        cls,
        csv_text: str,
        db: Session,
        user_id: str
    ) -> CsvImportPreviewResponse:
        reader = csv.reader(io.StringIO(csv_text.strip()))
        rows = [row for row in reader if row and any(cell.strip() for cell in row)]
        
        if not rows:
            return CsvImportPreviewResponse(
                total_parsed=0,
                duplicates_detected=0,
                eligible_to_import=0,
                preview_items=[]
            )

        # 1. Identify header row
        header_idx = -1
        col_map = {}

        for idx, row in enumerate(rows[:10]):
            joined = " ".join(c.lower() for c in row)
            if any(k in joined for k in ["date", "narration", "description", "withdrawal", "deposit", "debit", "credit", "amount"]):
                header_idx = idx
                for col_i, cell in enumerate(row):
                    cl = cell.strip().lower()
                    if "date" in cl and "value" not in cl:
                        col_map["date"] = col_i
                    elif any(k in cl for k in ["narration", "description", "particulars", "remarks"]):
                        col_map["desc"] = col_i
                    elif any(k in cl for k in ["withdrawal", "debit", "dr"]):
                        col_map["debit"] = col_i
                    elif any(k in cl for k in ["deposit", "credit", "cr"]):
                        col_map["credit"] = col_i
                    elif "amount" in cl and "debit" not in col_map:
                        col_map["amount"] = col_i
                    elif any(k in cl for k in ["chq", "ref", "reference", "utr"]):
                        col_map["ref"] = col_i
                break

        if header_idx == -1 or "desc" not in col_map:
            # Fallback column index defaults: col 0 = date, col 1 = desc, col 2 = debit, col 3 = credit
            col_map = {"date": 0, "desc": 1, "debit": 2, "credit": 3}
            data_rows = rows
        else:
            data_rows = rows[header_idx + 1:]

        # Fetch existing user transactions for duplicate lookup
        user_rules = db.query(MerchantRule).filter(MerchantRule.user_id == user_id, MerchantRule.is_active == True).all()
        existing_hashes = {
            t.deduplication_hash for t in db.query(Transaction.deduplication_hash).filter(
                Transaction.user_id == user_id,
                Transaction.deduplication_hash.isnot(None)
            ).all()
        }

        preview_items: List[CsvPreviewItem] = []
        duplicates_count = 0

        for row in data_rows:
            try:
                date_val = row[col_map["date"]].strip() if "date" in col_map and len(row) > col_map["date"] else ""
                desc_val = row[col_map["desc"]].strip() if "desc" in col_map and len(row) > col_map["desc"] else ""
                ref_val = row[col_map["ref"]].strip() if "ref" in col_map and len(row) > col_map["ref"] else ""

                if not desc_val or not date_val:
                    continue

                formatted_date = cls.parse_indian_date(date_val)

                # Determine amount and direction
                amount = 0.0
                direction = "debit"

                if "debit" in col_map and "credit" in col_map:
                    debit_str = row[col_map["debit"]].replace(',', '').strip() if len(row) > col_map["debit"] else ""
                    credit_str = row[col_map["credit"]].replace(',', '').strip() if len(row) > col_map["credit"] else ""
                    
                    if debit_str and float(debit_str or 0) > 0:
                        amount = float(debit_str)
                        direction = "debit"
                    elif credit_str and float(credit_str or 0) > 0:
                        amount = float(credit_str)
                        direction = "credit"
                    else:
                        continue
                elif "amount" in col_map:
                    amt_str = row[col_map["amount"]].replace(',', '').strip() if len(row) > col_map["amount"] else ""
                    raw_amt = float(amt_str or 0)
                    if raw_amt < 0:
                        amount = abs(raw_amt)
                        direction = "debit"
                    else:
                        amount = raw_amt
                        direction = "credit"
                else:
                    continue

                if amount <= 0:
                    continue

                # Type classification: salary/income vs expense vs refund
                tx_type = "expense"
                lower_desc = desc_val.lower()
                if direction == "credit":
                    if "refund" in lower_desc or "reversal" in lower_desc:
                        tx_type = "refund"
                    else:
                        tx_type = "income"
                elif "transfer" in lower_desc or "self" in lower_desc or "own a/c" in lower_desc:
                    tx_type = "transfer"

                # Categorize merchant
                merchant_name, category, _ = classify_merchant(desc_val, user_rules)

                # Extract payment method
                method = "UPI" if "upi" in lower_desc else ("Card" if "pos" in lower_desc or "card" in lower_desc else "Net Banking")
                
                # Deduplication check
                dedup_hash = cls.generate_dedup_hash(formatted_date, amount, direction, desc_val)
                is_duplicate = dedup_hash in existing_hashes

                if is_duplicate:
                    duplicates_count += 1
                else:
                    # Also guard against duplicates within the same batch
                    existing_hashes.add(dedup_hash)

                preview_items.append(CsvPreviewItem(
                    date=formatted_date,
                    description=desc_val,
                    merchant=merchant_name,
                    category=category,
                    amount=round(amount, 2),
                    direction=direction,
                    type=tx_type,
                    payment_method=method,
                    account_last4="",
                    is_duplicate=is_duplicate,
                    ref_number=ref_val
                ))
            except Exception:
                continue

        eligible = len(preview_items) - duplicates_count
        return CsvImportPreviewResponse(
            total_parsed=len(preview_items),
            duplicates_detected=duplicates_count,
            eligible_to_import=eligible,
            preview_items=preview_items
        )
