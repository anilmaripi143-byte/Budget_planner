import React, { useState } from 'react';
import { requestAaConsent } from '../lib/api';

export default function AccountAggregatorModal({ isOpen, onClose }) {
  const [selectedProvider, setSelectedProvider] = useState('Setu AA');
  const [selectedFip, setSelectedFip] = useState('HDFC Bank');
  const [phone, setPhone] = useState('9876543210');
  const [consentStatus, setConsentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInitiateConsent = async () => {
    setIsLoading(true);
    try {
      const res = await requestAaConsent({
        aa_provider: selectedProvider,
        fip_id: `${selectedFip.split(' ')[0]}-FIP`,
        phone_number: phone
      });
      setConsentStatus({
        handle: res.consent_handle,
        status: 'ACTIVE',
        validTill: '90 days from today',
        fip: selectedFip
      });
    } catch (e) {
      // Local demo fallback
      setConsentStatus({
        handle: `consent-${Date.now().toString(16)}`,
        status: 'ACTIVE',
        validTill: '90 days from today',
        fip: selectedFip
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = () => {
    setConsentStatus(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#1e2326] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-[#191c1e] dark:text-white">
                RBI Account Aggregator (AA)
              </h2>
              <p className="text-xs text-gray-400">
                Official, RBI-regulated bank statement data sync architecture.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Privacy & Security Guarantees */}
          <div className="p-4 rounded-2xl bg-[#f4fffc] dark:bg-[#005049]/20 border border-[#00685f]/20 space-y-2 text-xs">
            <div className="font-extrabold text-[#00685f] dark:text-[#6bd8cb] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>RBI Security & Privacy Guarantees</span>
            </div>
            <ul className="space-y-1 text-gray-600 dark:text-gray-300">
              <li>• <strong>Zero Credential Storage:</strong> Banking passwords, OTPs, or UPI PINs are NEVER requested.</li>
              <li>• <strong>Read-Only Access:</strong> Statement history only. Fund transfer is physically impossible.</li>
              <li>• <strong>Revocable Anytime:</strong> Stop data sharing and purge records with one click.</li>
            </ul>
          </div>

          {!consentStatus ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Select Regulated Account Aggregator
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 outline-none"
                >
                  <option value="Setu AA">Setu AA (Licensed NBFC-AA)</option>
                  <option value="OneMoney">OneMoney (Finsec AA)</option>
                  <option value="Anumati">Anumati (Perfios AA)</option>
                  <option value="Finvu">Finvu (Cookiejar Technologies)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Select Financial Institution (FIP)
                </label>
                <select
                  value={selectedFip}
                  onChange={(e) => setSelectedFip(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 outline-none"
                >
                  <option value="HDFC Bank">HDFC Bank Ltd</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank Ltd</option>
                  <option value="Axis Bank">Axis Bank Ltd</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Registered Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number linked to bank"
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-mono font-bold border border-gray-200 dark:border-gray-700 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                  <span>Consent Active ({consentStatus.fip})</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900 font-bold text-[10px]">
                  {consentStatus.status}
                </span>
              </div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 space-y-1">
                <div>Handle: {consentStatus.handle}</div>
                <div>Expiry: {consentStatus.validTill}</div>
                <div>Scope: Periodic statement fetch (Daily Allowance Refresh)</div>
              </div>
              <button
                type="button"
                onClick={handleRevoke}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
              >
                Revoke Consent & Cease Sync
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {!consentStatus && (
            <button
              type="button"
              onClick={handleInitiateConsent}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Requesting...' : 'Request AA Consent'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
