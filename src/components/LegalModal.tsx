import React, { useEffect } from 'react';
import { 
  X, 
  FileText, 
  Shield, 
  RefreshCcw, 
  Mail, 
  AlertCircle
} from 'lucide-react';

export type LegalTab = 'terms' | 'privacy' | 'refund' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: LegalTab;
  onTabChange?: (tab: LegalTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'terms',
  onTabChange,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTab = activeTab || 'terms';

  const setTab = (tab: LegalTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[88vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col text-left text-zinc-900 dark:text-zinc-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Header with Brand & Close Button */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-lg tracking-tight text-zinc-950 dark:text-white">PULSE</span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span id="legal-modal-title" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {currentTab === 'terms' && 'Terms & Conditions'}
              {currentTab === 'privacy' && 'Privacy Policy'}
              {currentTab === 'refund' && 'Refund & Cancellation Policy'}
              {currentTab === 'contact' && 'Contact & Support'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Segmented Pill Bar with Guaranteed No-Scrollbar) */}
        <div className="px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 dark:bg-zinc-900/90 rounded-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTab('terms')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                currentTab === 'terms'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Terms & Conditions</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('privacy')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                currentTab === 'privacy'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('refund')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                currentTab === 'refund'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Refund & Cancellation</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('contact')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                currentTab === 'contact'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Contact & Support</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans bg-white dark:bg-zinc-950">
          
          {/* ==================== 1. TERMS & CONDITIONS ==================== */}
          {currentTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">PULSE — Terms & Conditions</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Effective Date: 12 October 2026</span>
                  <span>•</span>
                  <span>Website: <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="text-zinc-900 dark:text-zinc-100 underline">https://pulse.avixstudio.com</a></span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">1. About PULSE</h3>
                <p>
                  PULSE is a fitness and wellness application that helps users track their fitness activities, monitor progress, and participate in groups with other members.
                </p>
                <p>
                  By accessing or using PULSE, you agree to these Terms & Conditions. If you do not agree, please do not use the application.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">2. Eligibility and Accounts</h3>
                <p>
                  You must provide accurate information when creating an account and keep your login credentials secure. You are responsible for activities performed through your account, subject to applicable law.
                </p>
                <p>
                  Do not impersonate another person, misuse another user's information, or attempt to access accounts or groups without authorization.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">3. Use of the Application</h3>
                <p>You agree to use PULSE lawfully and respectfully. You must not:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Attempt to access another user's private account or information without authorization.</li>
                  <li>Misuse, disrupt, damage, or reverse engineer the application unlawfully.</li>
                  <li>Upload content that is unlawful, abusive, threatening, or infringes another person's rights.</li>
                  <li>Manipulate payments, subscriptions, group membership, or application functionality.</li>
                </ul>
                <p>
                  We may restrict or suspend access when reasonably necessary to address misuse, security risks, or violations of these Terms, subject to applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">4. Groups and Information Visibility</h3>
                <p>
                  PULSE provides group-based features for fitness tracking and progress sharing.
                </p>
                <p>
                  Information shared within a group is intended to be visible only to the relevant group members. Group members must respect the privacy of other members and must not copy, publish, distribute, or misuse their information without authorization.
                </p>
                <p>
                  PULSE may process or access information through authorized personnel and service providers when necessary to operate, secure, maintain, or support the application, comply with legal obligations, or resolve technical issues.
                </p>
                <p>
                  Users should not share sensitive information unless they understand how it will be used and who may access it.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">5. Paid Plans and Payments</h3>
                <p>Certain features may require payment.</p>
                <p>
                  Before completing a purchase, users will be shown the applicable plan, price, paid duration, and relevant conditions.
                </p>
                <p>
                  Payment grants access to the purchased paid features for the specified paid period, subject to these Terms and the plan description.
                </p>
                <p>
                  Once the paid period ends, access to paid features may expire unless the user purchases or renews an eligible plan.
                </p>
                <p>
                  Renewal is optional. A new payment will not be taken automatically unless the user has expressly agreed to an applicable recurring-payment arrangement and the required authorization has been obtained.
                </p>
                <p>
                  Payments are processed through the designated payment provider, such as Razorpay. Payment processing is subject to the provider's applicable terms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">6. Refunds and Cancellations</h3>
                <p>
                  Payments are generally non-refundable once successfully completed, including where a user changes their mind or chooses not to use the paid features.
                </p>
                <p>
                  This policy does not exclude refunds, reversals, or other remedies required by applicable law, or the resolution of duplicate, unauthorized, or incorrectly processed transactions as required by law or the payment provider's rules.
                </p>
                <p>
                  Please read the Refund & Cancellation Policy before purchasing a plan.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">7. Fitness Disclaimer</h3>
                <p>
                  PULSE is intended to support fitness tracking and general wellness. It is not a substitute for medical advice, diagnosis, treatment, or supervision by a qualified healthcare professional.
                </p>
                <p>
                  Any fitness-related insights, calculations, or AI-generated suggestions should be considered informational. You are responsible for exercising appropriate judgment and seeking professional guidance when necessary.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">8. Intellectual Property</h3>
                <p>
                  The PULSE name, branding, original interface designs, software, graphics, and other original materials are owned by or licensed to the relevant rights holder.
                </p>
                <p>
                  You may not copy, reproduce, distribute, modify, or commercially exploit protected materials without authorization, except as permitted by applicable law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">9. Availability and Changes</h3>
                <p>
                  We aim to keep PULSE available and functioning reliably but cannot guarantee uninterrupted service. Maintenance, technical failures, security incidents, or third-party outages may temporarily affect availability.
                </p>
                <p>
                  We may update features, plans, pricing, or these Terms. Material changes will be communicated where required by applicable law. Changes to pricing will not retroactively alter an already purchased fixed-duration plan unless legally permitted and properly disclosed.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">10. Account Closure</h3>
                <p>
                  You may stop using PULSE and request account deletion through the available account settings or by contacting support.
                </p>
                <p>
                  Certain information may need to be retained for legitimate operational, security, dispute-resolution, accounting, or legal purposes, subject to applicable law and the Privacy Policy.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">11. Limitation of Liability</h3>
                <p>
                  To the extent permitted by applicable law, PULSE is not responsible for indirect losses arising from ordinary use of the application, temporary unavailability, or user-generated content shared by other members.
                </p>
                <p>
                  Nothing in these Terms excludes liability or consumer rights that cannot lawfully be excluded or restricted.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">12. Governing Law</h3>
                <p>
                  These Terms are governed by the laws of India, subject to applicable consumer protection laws and the jurisdiction of competent courts or authorities.
                </p>
              </section>

              <section className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">13. Contact</h3>
                <p className="text-xs sm:text-sm">For questions, complaints, or support, contact:</p>
                <div className="text-xs space-y-1 mt-2">
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Application:</span> PULSE</p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Website:</span> <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="underline">https://pulse.avixstudio.com</a></p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Email:</span> <a href="mailto:supportpulseteam@gmail.com" className="underline">supportpulseteam@gmail.com</a></p>
                </div>
              </section>
            </div>
          )}

          {/* ==================== 2. PRIVACY POLICY ==================== */}
          {currentTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">PULSE — Privacy Policy</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Effective Date: 12 October 2026</span>
                  <span>•</span>
                  <span>Website: <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="text-zinc-900 dark:text-zinc-100 underline">https://pulse.avixstudio.com</a></span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">1. Introduction</h3>
                <p>
                  PULSE respects user privacy. This Privacy Policy explains what information may be processed when you use the application, how it is used, how it is protected, and with whom it may be shared.
                </p>
                <p>
                  We do not sell users' personal information or use it for targeted advertising, provided this remains consistent with our actual practices.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">2. Information We Process</h3>
                <p>To provide the application's features, PULSE may process the following categories of information:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li><strong>Account information:</strong> Information used to create and manage your account, such as your profile details and authentication identifiers.</li>
                  <li><strong>Fitness information:</strong> Workout records, daily activity logs, weight entries, habits, progress information, and other information you choose to enter.</li>
                  <li><strong>Group information:</strong> Group membership, invitations, reactions, and information shared within your groups.</li>
                  <li><strong>Profile media:</strong> Profile pictures, progress photographs, or other media you choose to upload.</li>
                  <li><strong>Payment information:</strong> Payment status, transaction references, plan details, and subscription-period information required to manage purchases.</li>
                </ul>
                <p>
                  PULSE uses third-party services to provide authentication, database storage, media storage, hosting, and payment processing. These providers may process information as necessary to deliver their services.
                </p>
                <p>
                  We do not intentionally collect information unrelated to operating, securing, or improving the application's core functionality. Actual data processing depends on the features you use and the technical services enabled.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">3. How We Use Information</h3>
                <p>Information may be processed to:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Create and maintain accounts.</li>
                  <li>Provide fitness tracking and group functionality.</li>
                  <li>Display information to the appropriate group members.</li>
                  <li>Manage paid plans, verify payments, and determine access periods.</li>
                  <li>Protect accounts, prevent misuse, troubleshoot errors, and maintain security.</li>
                  <li>Respond to support requests and comply with applicable legal obligations.</li>
                </ul>
                <p>We do not sell personal information or use it for targeted advertising.</p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">4. Who Can See Your Information?</h3>
                <p>PULSE is designed to restrict group-shared information to members of the relevant group.</p>
                <p>Depending on the feature and your settings:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Group members may see information shared within their group.</li>
                  <li>Information not shared with a group should not be treated as group-visible merely because it is stored in the application.</li>
                  <li>Authorized personnel and infrastructure providers may access or process information when necessary for application operation, maintenance, support, security, payment verification, or legal compliance.</li>
                  <li>Payment providers process payment details under their own applicable privacy and security terms.</li>
                </ul>
                <p>
                  Group members may independently take screenshots, copy information, or disclose information they can access. Please exercise care when sharing personal fitness information.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">5. Payments</h3>
                <p>
                  Payments are processed through the designated payment provider. PULSE may receive transaction references, payment status, plan information, and other limited details required to verify a purchase and manage access.
                </p>
                <p>
                  Do not assume that PULSE itself stores your complete card number, CVV, UPI PIN, or payment credentials. Payment processing and storage are handled according to the payment provider's implementation and applicable requirements.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">6. Storage and Security</h3>
                <p>
                  PULSE uses database and storage infrastructure to provide its services. We take reasonable steps to protect information against unauthorized access, alteration, loss, or disclosure.
                </p>
                <p>
                  No internet-based service can guarantee absolute security. Users should protect their login credentials and report suspected unauthorized access promptly.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">7. Retention and Deletion</h3>
                <p>
                  Information is retained for as long as reasonably necessary to provide the service, maintain accounts, support group functionality, resolve disputes, protect security, and satisfy applicable legal obligations.
                </p>
                <p>
                  You may request account deletion or removal of eligible information by contacting us. Some information may need to be retained where required or permitted by law.
                </p>
                <p>
                  Deleting an account may affect access to fitness history, group features, or other stored information.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">8. Third-Party Services</h3>
                <p>
                  PULSE relies on third-party providers for some technical and payment functions, which may include Supabase, hosting providers, and Razorpay.
                </p>
                <p>
                  These providers process information according to their roles, contractual arrangements, and applicable privacy policies. Their own terms may also apply when you use their services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">9. Your Choices and Rights</h3>
                <p>
                  Subject to applicable law, you may request access to, correction of, or deletion of your personal information and may raise questions or complaints about its processing.
                </p>
                <p>
                  You may also stop using the application. Certain processing or retention may continue where legally required or otherwise permitted.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">10. Children's Privacy</h3>
                <p>
                  PULSE is not intended to be used in violation of applicable age requirements or child-protection laws. Where parental consent or other safeguards are legally required, those requirements must be satisfied before the relevant processing takes place.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">11. Changes to This Policy</h3>
                <p>
                  We may update this Privacy Policy when our features, data practices, or legal obligations change. The updated version will be published on this page with a revised effective date where appropriate.
                </p>
              </section>

              <section className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">12. Contact and Privacy Requests</h3>
                <p className="text-xs sm:text-sm">For privacy questions, data requests, or complaints, contact:</p>
                <div className="text-xs space-y-1 mt-2">
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Application:</span> PULSE</p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Website:</span> <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="underline">https://pulse.avixstudio.com</a></p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Privacy / Support Email:</span> <a href="mailto:supportpulseteam@gmail.com" className="underline">supportpulseteam@gmail.com</a></p>
                </div>
              </section>
            </div>
          )}

          {/* ==================== 3. REFUND & CANCELLATION ==================== */}
          {currentTab === 'refund' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">PULSE — Refund & Cancellation Policy</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Effective Date: 12 October 2026</span>
                  <span>•</span>
                  <span>Website: <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="text-zinc-900 dark:text-zinc-100 underline">https://pulse.avixstudio.com</a></span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">1. General Policy</h3>
                <p>
                  All purchases of paid PULSE plans are considered final once payment has been successfully completed.
                </p>
                <p>
                  PULSE generally does not offer refunds for completed purchases, including when a user changes their mind, stops using the application, or does not use all the features available during the paid period.
                </p>
                <p>
                  This policy is subject to applicable law and does not exclude any refund, reversal, or remedy that must legally be provided.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">2. Paid Access Period</h3>
                <p>
                  A successful payment provides access to the applicable paid features for the duration specified on the plan or checkout page.
                </p>
                <p>
                  Access remains valid for the purchased period, subject to the Terms & Conditions. Once the paid period expires, access to paid features may end unless the user purchases or renews a plan.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">3. Renewal and Cancellation</h3>
                <p>
                  Renewal is optional. Users may choose whether to make another payment when their current paid period ends.
                </p>
                <p>
                  No automatic renewal will occur unless an applicable recurring-payment arrangement has been expressly authorized by the user.
                </p>
                <p>
                  Where recurring payments are enabled, users must be provided with the applicable renewal, cancellation, and authorization details before agreeing to them.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">4. Duplicate or Failed Transactions</h3>
                <p>
                  If a payment is debited but the purchase is not confirmed, please contact support with the transaction reference.
                </p>
                <p>
                  Duplicate charges, incorrectly processed payments, unauthorized transactions, and payment failures will be reviewed and handled in accordance with applicable law and the payment provider's procedures.
                </p>
                <p>
                  A payment being marked as pending does not necessarily mean that a purchase has been completed.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">5. Refund Processing Where Required</h3>
                <p>
                  Where a refund or reversal is legally required or otherwise approved, it will be processed through the appropriate payment channel. The time required for the funds to appear in the user's account may depend on the payment provider and the user's bank.
                </p>
              </section>

              <section className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">6. How to Contact Support</h3>
                <p className="text-xs sm:text-sm">For payment-related questions, contact:</p>
                <div className="text-xs space-y-1 mt-2">
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Email:</span> <a href="mailto:supportpulseteam@gmail.com" className="underline">supportpulseteam@gmail.com</a></p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Website:</span> <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="underline">https://pulse.avixstudio.com</a></p>
                  <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Required details:</span> Transaction reference, payment date, purchased plan, and a brief explanation of the issue.</p>
                  <p className="text-amber-600 dark:text-amber-400 font-medium pt-1">
                    Do not send your password, CVV, UPI PIN, or other payment authentication credentials to support.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">7. Policy Updates</h3>
                <p>
                  PULSE may update this policy when necessary, subject to applicable law. The policy applicable to a purchase will be determined in accordance with the law and the terms properly disclosed at the time of purchase.
                </p>
              </section>
            </div>
          )}

          {/* ==================== 4. CONTACT & SUPPORT ==================== */}
          {currentTab === 'contact' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xl font-black text-zinc-950 dark:text-white">Contact PULSE</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  We're here to help with account access, application functionality, group features, paid plans, and privacy-related questions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    Support
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    For general support, technical issues, or account-related questions:
                  </p>
                  <div className="text-xs space-y-1 pt-1">
                    <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Email:</span> <a href="mailto:supportpulseteam@gmail.com" className="underline">supportpulseteam@gmail.com</a></p>
                    <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Website:</span> <a href="https://pulse.avixstudio.com" target="_blank" rel="noreferrer" className="underline">https://pulse.avixstudio.com</a></p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 text-cyan-500" />
                    Payments & Billing
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    For questions about payment confirmation, paid-plan access, duplicate transactions, or billing issues, email us with your transaction reference and description.
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Never send your password, CVV, UPI PIN, or payment authentication credentials.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    Privacy Requests
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    For requests concerning your personal information, account deletion, or privacy concerns:
                  </p>
                  <p className="text-xs pt-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Privacy Contact:</span>{' '}
                    <a href="mailto:supportpulseteam@gmail.com" className="underline">supportpulseteam@gmail.com</a>
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Grievances
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    If you have a complaint about PULSE, please email <a href="mailto:supportpulseteam@gmail.com?subject=PULSE%20Grievance" className="underline font-semibold text-zinc-900 dark:text-zinc-100">supportpulseteam@gmail.com</a> with the subject line <strong>PULSE Grievance</strong>.
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Include a description of the issue and the best way to contact you. We will review and respond to complaints within the timeframes required by applicable law.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">
            © 2026 PULSE. All rights reserved.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
