import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, 
  FiLock, 
  FiMail, 
  FiPhone, 
  FiArrowLeft, 
  FiChevronDown, 
  FiChevronRight, 
  FiFileText, 
  FiMapPin, 
  FiUsers, 
  FiCheck,
  FiBriefcase,
  FiLayers
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import appLogo from '../assets/logo.svg';
import authIllustration from '../assets/auth_illustration.jpg';

const countries = [
  { code: 'AF', dial: '+93', flag: '🇦🇫', name: 'Afghanistan' }, 
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algeria' }, 
  { code: 'AO', dial: '+244', flag: '🇦🇴', name: 'Angola' }, 
  { code: 'AR', dial: '+54', flag: '🇦🇷', name: 'Argentina' }, 
  { code: 'AM', dial: '+374', flag: '🇦🇲', name: 'Armenia' }, 
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' }, 
  { code: 'AT', dial: '+43', flag: '🇦🇹', name: 'Austria' }, 
  { code: 'AZ', dial: '+994', flag: '🇦🇿', name: 'Azerbaijan' }, 
  { code: 'BS', dial: '+1-242', flag: '🇧🇸', name: 'Bahamas' }, 
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain' }, 
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' }, 
  { code: 'BB', dial: '+1-246', flag: '🇧🇧', name: 'Barbados' }, 
  { code: 'BY', dial: '+375', flag: '🇧🇾', name: 'Belarus' }, 
  { code: 'BE', dial: '+32', flag: '🇧🇪', name: 'Belgium' }, 
  { code: 'BJ', dial: '+229', flag: '🇧🇯', name: 'Benin' }, 
  { code: 'BT', dial: '+975', flag: '🇧🇹', name: 'Bhutan' }, 
  { code: 'BO', dial: '+591', flag: '🇧🇴', name: 'Bolivia' }, 
  { code: 'BW', dial: '+267', flag: '🇧🇼', name: 'Botswana' }, 
  { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brazil' }, 
  { code: 'BN', dial: '+673', flag: '🇧🇳', name: 'Brunei' }, 
  { code: 'BG', dial: '+359', flag: '🇧🇬', name: 'Bulgaria' }, 
  { code: 'BF', dial: '+226', flag: '🇧🇫', name: 'Burkina Faso' }, 
  { code: 'BI', dial: '+257', flag: '🇧🇮', name: 'Burundi' }, 
  { code: 'KH', dial: '+855', flag: '🇰🇭', name: 'Cambodia' }, 
  { code: 'CM', dial: '+237', flag: '🇨🇲', name: 'Cameroon' }, 
  { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' }, 
  { code: 'CV', dial: '+238', flag: '🇨🇻', name: 'Cape Verde' }, 
  { code: 'CF', dial: '+236', flag: '🇨🇫', name: 'Central African Republic' }, 
  { code: 'TD', dial: '+235', flag: '🇹🇩', name: 'Chad' }, 
  { code: 'CL', dial: '+56', flag: '🇨🇱', name: 'Chile' }, 
  { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China' }, 
  { code: 'CO', dial: '+57', flag: '🇨🇴', name: 'Colombia' }, 
  { code: 'KM', dial: '+269', flag: '🇰🇲', name: 'Comoros' }, 
  { code: 'CR', dial: '+506', flag: '🇨🇷', name: 'Costa Rica' }, 
  { code: 'CI', dial: '+225', flag: '🇨🇮', name: 'Cote dIvoire' }, 
  { code: 'HR', dial: '+385', flag: '🇭🇷', name: 'Croatia' }, 
  { code: 'CU', dial: '+53', flag: '🇨🇺', name: 'Cuba' }, 
  { code: 'CY', dial: '+357', flag: '🇨🇾', name: 'Cyprus' }, 
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Czech Republic' }, 
  { code: 'DK', dial: '+45', flag: '🇩🇰', name: 'Denmark' }, 
  { code: 'DJ', dial: '+253', flag: '🇩🇯', name: 'Djibouti' }, 
  { code: 'DO', dial: '+1-809', flag: '🇩🇴', name: 'Dominican Republic' }, 
  { code: 'CD', dial: '+243', flag: '🇨🇩', name: 'DR Congo' }, 
  { code: 'EC', dial: '+593', flag: '🇪🇨', name: 'Ecuador' }, 
  { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'Egypt' }, 
  { code: 'SV', dial: '+503', flag: '🇸🇻', name: 'El Salvador' }, 
  { code: 'GQ', dial: '+240', flag: '🇬🇶', name: 'Equatorial Guinea' }, 
  { code: 'EE', dial: '+372', flag: '🇪🇪', name: 'Estonia' }, 
  { code: 'SZ', dial: '+268', flag: '🇸🇿', name: 'Eswatini' }, 
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Ethiopia' }, 
  { code: 'FJ', dial: '+679', flag: '🇫🇯', name: 'Fiji' }, 
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland' }, 
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' }, 
  { code: 'GA', dial: '+241', flag: '🇬🇦', name: 'Gabon' }, 
  { code: 'GM', dial: '+220', flag: '🇬🇲', name: 'Gambia' }, 
  { code: 'GE', dial: '+995', flag: '🇬🇪', name: 'Georgia' }, 
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' }, 
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' }, 
  { code: 'GR', dial: '+30', flag: '🇬🇷', name: 'Greece' }, 
  { code: 'GT', dial: '+502', flag: '🇬🇹', name: 'Guatemala' }, 
  { code: 'GN', dial: '+224', flag: '🇬🇳', name: 'Guinea' }, 
  { code: 'GW', dial: '+245', flag: '🇬🇼', name: 'Guinea-Bissau' }, 
  { code: 'GY', dial: '+592', flag: '🇬🇾', name: 'Guyana' }, 
  { code: 'HT', dial: '+509', flag: '🇭🇹', name: 'Haiti' }, 
  { code: 'HN', dial: '+504', flag: '🇭🇳', name: 'Honduras' }, 
  { code: 'HK', dial: '+852', flag: '🇭🇰', name: 'Hong Kong' }, 
  { code: 'HU', dial: '+36', flag: '🇭🇺', name: 'Hungary' }, 
  { code: 'IS', dial: '+354', flag: '🇮🇸', name: 'Iceland' }, 
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' }, 
  { code: 'ID', dial: '+62', flag: '🇮🇩', name: 'Indonesia' }, 
  { code: 'IR', dial: '+98', flag: '🇮🇷', name: 'Iran' }, 
  { code: 'IQ', dial: '+964', flag: '🇮🇶', name: 'Iraq' }, 
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland' }, 
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel' }, 
  { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italy' }, 
  { code: 'JM', dial: '+1-876', flag: '🇯🇲', name: 'Jamaica' }, 
  { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan' }, 
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordan' }, 
  { code: 'KZ', dial: '+7', flag: '🇰🇿', name: 'Kazakhstan' }, 
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' }, 
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait' }, 
  { code: 'KG', dial: '+996', flag: '🇰🇬', name: 'Kyrgyzstan' }, 
  { code: 'LA', dial: '+856', flag: '🇱🇦', name: 'Laos' }, 
  { code: 'LV', dial: '+371', flag: '🇱🇻', name: 'Latvia' }, 
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'Lebanon' }, 
  { code: 'LS', dial: '+266', flag: '🇱🇸', name: 'Lesotho' }, 
  { code: 'LR', dial: '+231', flag: '🇱🇷', name: 'Liberia' }, 
  { code: 'LY', dial: '+218', flag: '🇱🇾', name: 'Libya' }, 
  { code: 'LI', dial: '+423', flag: '🇱🇮', name: 'Liechtenstein' }, 
  { code: 'LT', dial: '+370', flag: '🇱🇹', name: 'Lithuania' }, 
  { code: 'LU', dial: '+352', flag: '🇱🇺', name: 'Luxembourg' }, 
  { code: 'MO', dial: '+853', flag: '🇲🇴', name: 'Macau' }, 
  { code: 'MG', dial: '+261', flag: '🇲🇬', name: 'Madagascar' }, 
  { code: 'MW', dial: '+265', flag: '🇲🇼', name: 'Malawi' }, 
  { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia' }, 
  { code: 'MV', dial: '+960', flag: '🇲🇻', name: 'Maldives' }, 
  { code: 'ML', dial: '+223', flag: '🇲🇱', name: 'Mali' }, 
  { code: 'MT', dial: '+356', flag: '🇲🇹', name: 'Malta' }, 
  { code: 'MR', dial: '+222', flag: '🇲🇷', name: 'Mauritania' }, 
  { code: 'MU', dial: '+230', flag: '🇲🇺', name: 'Mauritius' }, 
  { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'Mexico' }, 
  { code: 'MD', dial: '+373', flag: '🇲🇩', name: 'Moldova' }, 
  { code: 'MC', dial: '+377', flag: '🇲🇨', name: 'Monaco' }, 
  { code: 'MN', dial: '+976', flag: '🇲🇳', name: 'Mongolia' }, 
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Morocco' }, 
  { code: 'MZ', dial: '+258', flag: '🇲🇿', name: 'Mozambique' }, 
  { code: 'MM', dial: '+95', flag: '🇲🇲', name: 'Myanmar' }, 
  { code: 'NA', dial: '+264', flag: '🇳🇦', name: 'Namibia' }, 
  { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' }, 
  { code: 'NL', dial: '+31', flag: '🇳🇱', name: 'Netherlands' }, 
  { code: 'NZ', dial: '+64', flag: '🇳🇿', name: 'New Zealand' }, 
  { code: 'NI', dial: '+505', flag: '🇳🇮', name: 'Nicaragua' }, 
  { code: 'NE', dial: '+227', flag: '🇳🇪', name: 'Niger' }, 
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' }, 
  { code: 'NO', dial: '+47', flag: '🇳🇴', name: 'Norway' }, 
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' }, 
  { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan' }, 
  { code: 'PS', dial: '+970', flag: '🇵🇸', name: 'Palestine' }, 
  { code: 'PA', dial: '+507', flag: '🇵🇦', name: 'Panama' }, 
  { code: 'PG', dial: '+675', flag: '🇵🇬', name: 'Papua New Guinea' }, 
  { code: 'PY', dial: '+595', flag: '🇵🇾', name: 'Paraguay' }, 
  { code: 'PE', dial: '+51', flag: '🇵🇪', name: 'Peru' }, 
  { code: 'PH', dial: '+63', flag: '🇵🇭', name: 'Philippines' }, 
  { code: 'PL', dial: '+48', flag: '🇵🇱', name: 'Poland' }, 
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' }, 
  { code: 'PR', dial: '+1-787', flag: '🇵🇷', name: 'Puerto Rico' }, 
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' }, 
  { code: 'CG', dial: '+242', flag: '🇨🇬', name: 'Republic of the Congo' }, 
  { code: 'RO', dial: '+40', flag: '🇷🇴', name: 'Romania' }, 
  { code: 'RU', dial: '+7', flag: '🇷🇺', name: 'Russia' }, 
  { code: 'RW', dial: '+250', flag: '🇷🇼', name: 'Rwanda' }, 
  { code: 'ST', dial: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe' }, 
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' }, 
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Senegal' }, 
  { code: 'RS', dial: '+381', flag: '🇷🇸', name: 'Serbia' }, 
  { code: 'SC', dial: '+248', flag: '🇸🇨', name: 'Seychelles' }, 
  { code: 'SL', dial: '+232', flag: '🇸🇱', name: 'Sierra Leone' }, 
  { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' }, 
  { code: 'SK', dial: '+421', flag: '🇸🇰', name: 'Slovakia' }, 
  { code: 'SO', dial: '+252', flag: '🇸🇴', name: 'Somalia' }, 
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' }, 
  { code: 'KR', dial: '+82', flag: '🇰🇷', name: 'South Korea' }, 
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain' }, 
  { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka' }, 
  { code: 'SD', dial: '+249', flag: '🇸🇩', name: 'Sudan' }, 
  { code: 'SR', dial: '+597', flag: '🇸🇷', name: 'Suriname' }, 
  { code: 'SE', dial: '+46', flag: '🇸🇪', name: 'Sweden' }, 
  { code: 'CH', dial: '+41', flag: '🇨🇭', name: 'Switzerland' }, 
  { code: 'SY', dial: '+963', flag: '🇸🇾', name: 'Syria' }, 
  { code: 'TW', dial: '+886', flag: '🇹🇼', name: 'Taiwan' }, 
  { code: 'TJ', dial: '+992', flag: '🇹🇯', name: 'Tajikistan' }, 
  { code: 'TZ', dial: '+255', flag: '🇹🇿', name: 'Tanzania' }, 
  { code: 'TH', dial: '+66', flag: '🇹🇭', name: 'Thailand' }, 
  { code: 'TL', dial: '+670', flag: '🇹🇱', name: 'Timor-Leste' }, 
  { code: 'TG', dial: '+228', flag: '🇹🇬', name: 'Togo' }, 
  { code: 'TT', dial: '+1-868', flag: '🇹🇹', name: 'Trinidad & Tobago' }, 
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisia' }, 
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Turkey' }, 
  { code: 'TM', dial: '+993', flag: '🇹🇲', name: 'Turkmenistan' }, 
  { code: 'UG', dial: '+256', flag: '🇺🇬', name: 'Uganda' }, 
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Ukraine' }, 
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'United Arab Emirates' }, 
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' }, 
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' }, 
  { code: 'UY', dial: '+598', flag: '🇺🇾', name: 'Uruguay' }, 
  { code: 'UZ', dial: '+998', flag: '🇺🇿', name: 'Uzbekistan' }, 
  { code: 'VE', dial: '+58', flag: '🇻🇪', name: 'Venezuela' }, 
  { code: 'VN', dial: '+84', flag: '🇻🇳', name: 'Vietnam' }, 
  { code: 'YE', dial: '+967', flag: '🇾🇪', name: 'Yemen' }, 
  { code: 'ZM', dial: '+260', flag: '🇿🇲', name: 'Zambia' }, 
  { code: 'ZW', dial: '+263', flag: '🇿🇼', name: 'Zimbabwe' }, 
];

const AuthPages = ({ onBack }) => {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [tab, setTab] = useState('login');
  const [regStep, setRegStep] = useState(null); // null | 'personal' | 'business' | 'organization'
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAccountType, setRegAccountType] = useState('personal');
  const [selectedCountry, setSelectedCountry] = useState({ code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Business fields
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regTaxId, setRegTaxId] = useState('');
  const [regBusinessAddress, setRegBusinessAddress] = useState('');
  
  // Organization fields
  const [regOrgName, setRegOrgName] = useState('');
  const [regOrgIndustry, setRegOrgIndustry] = useState('');
  const [regOrgSize, setRegOrgSize] = useState('');
  const [regOrgDescription, setRegOrgDescription] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try { await login(loginEmail, loginPassword); } catch (err) {} finally { setLoading(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      toast.error('Name, username, email, password are required.');
      return;
    }
    if (regAccountType === 'business') {
      if (!regCompanyName.trim() || !regTaxId.trim()) {
        toast.error('Business name and Tax ID are required.');
        return;
      }
    }
    if (regAccountType === 'organization') {
      if (!regOrgName.trim() || !regOrgIndustry.trim()) {
        toast.error('Organization name and industry are required.');
        return;
      }
    }
    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const fullPhone = regPhone.trim() ? selectedCountry.dial + regPhone : '';
    const businessFields = {
      businessName: regCompanyName,
      category: '',
      description: '',
      address: regBusinessAddress
    };
    const orgFields = {
      orgName: regOrgName,
      orgType: regOrgIndustry.toLowerCase().replace(/\s+/g, '_') || 'other',
      orgDescription: regOrgDescription
    };
    try { await register(regName, regUsername, regEmail, regPassword, fullPhone, regAccountType, businessFields, orgFields); } catch (err) {} finally { setLoading(false); }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error('Please enter your email address.'); return; }
    setLoading(true);
    const success = await forgotPassword(forgotEmail);
    setLoading(false);
    if (success) setTab('reset');
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode.trim() || !resetNewPassword.trim()) { toast.error('Code and new password are required.'); return; }
    setLoading(true);
    const success = await resetPassword(forgotEmail, resetCode, resetNewPassword);
    setLoading(false);
    if (success) { setTab('login'); setForgotEmail(''); setResetCode(''); setResetNewPassword(''); }
  };

  const inputClass = "w-full bg-[var(--bg-input)] border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/5 transition-all placeholder:text-[var(--text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] px-4 py-8 lg:p-12 selection:bg-[#2563EB]/20">
      
      {/* Structural layout card */}
      <div className="w-full max-w-6xl mx-auto bg-[var(--bg-sidebar)]/30 border-[var(--border-color)] rounded-3xl shadow-2xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left: Form panel */}
        <div className="col-span-1 lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative">
          
          {/* Back button */}
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              <FiArrowLeft size={14} />
              Back to home
            </button>
          )}

          <div className="w-full max-w-md mx-auto my-auto space-y-8">
            
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-sidebar)] border-[var(--border-color)] flex items-center justify-center p-2 shadow-sm">
                <img src={appLogo} alt="Aether" className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-bold text-[var(--text-primary)] tracking-tight font-display">AetherChat</span>
            </div>

            {/* Tab switcher */}
            {(tab === 'login' || tab === 'register') && (
              <div className="flex bg-[var(--bg-sidebar)] p-1 rounded-xl w-56 border-[var(--border-color)]">
                <button 
                  onClick={() => setTab('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    tab === 'login' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Sign in
                </button>
                <button 
                  onClick={() => setTab('register')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    tab === 'register' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Register
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Login Stage */}
              {tab === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Welcome back</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">Sign in to coordinate and secure your sessions.</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Email or Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMail size={15} /></span>
                        <input type="text" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                        <button type="button" onClick={() => setTab('forgot')} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[#2563EB] cursor-pointer bg-transparent border-none outline-none transition-colors">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLock size={15} /></span>
                        <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass} required />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-[var(--text-primary)] font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#2563EB]/10">
                      {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Register Stage — Type Picker */}
              {tab === 'register' && !regStep && (
                <motion.div key="register-picker" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Create your account</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">Choose the type of account you want to create.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { type: 'personal', label: 'Personal Account', desc: 'For individual use — chats, calls, channels and more.', icon: <FiUser size={22} />, color: '#2563EB' },
                      { type: 'business', label: 'Business Account', desc: 'For companies — manage products, services, and appointments.', icon: <FiBriefcase size={22} />, color: '#2563EB' },
                      { type: 'organization', label: 'Organization Account', desc: 'For enterprises — manage orgs, departments, and teams.', icon: <FiLayers size={22} />, color: '#2563EB' }
                    ].map(opt => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => { setRegStep(opt.type); setRegAccountType(opt.type); }}
                        className="w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] hover:border-[#2563EB]/20 flex items-center gap-4 text-left transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${opt.color}15`, color: opt.color }}>
                          {opt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[#2563EB] transition-colors">{opt.label}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{opt.desc}</p>
                        </div>
                        <FiChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[#2563EB] transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Register Stage — Personal Form */}
              {tab === 'register' && regStep === 'personal' && (
                <motion.div key="register-personal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <button type="button" onClick={() => setRegStep(null)} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 transition-colors cursor-pointer bg-transparent border-none outline-none">
                      <FiArrowLeft size={14} /> Back to account type
                    </button>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Personal Account</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">For individual use — chats, calls, channels and more.</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiUser size={15} /></span>
                        <input type="text" placeholder="Alex Mercer" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-muted)] text-sm font-medium">@</span>
                        <input type="text" placeholder="alex" value={regUsername} onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMail size={15} /></span>
                        <input type="email" placeholder="alex@aether.io" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLock size={15} /></span>
                        <input type="password" placeholder="At least 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Phone <span className="text-[var(--text-muted)]">(optional)</span></label>
                      <div className="flex gap-2">
                        <div className="relative shrink-0">
                          <button type="button" onClick={() => setShowCountryPicker(!showCountryPicker)} className="h-[42px] bg-[var(--bg-input)] border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-primary)] flex items-center gap-2 hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                            <span className="text-lg">{selectedCountry.flag}</span>
                            <span className="font-semibold">{selectedCountry.dial}</span>
                            <FiChevronDown size={12} className={`text-[var(--text-muted)] transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                          </button>
                          {showCountryPicker && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => { setShowCountryPicker(false); setCountrySearch(''); }} />
                              <div className="absolute bottom-full mb-2 left-0 w-72 bg-[var(--bg-sidebar)] border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-app)]">
                                  <input type="text" placeholder="Search country..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="w-full bg-[var(--bg-hover)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border-[var(--border-color)] rounded-lg px-3 py-2" autoFocus />
                                </div>
                                <div className="max-h-60 overflow-y-auto no-scrollbar">
                                  {countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)).map(c => (
                                    <button key={c.code} type="button" onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); setCountrySearch(''); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${selectedCountry.code === c.code ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-[var(--text-primary)]'}`}>
                                      <span className="text-lg">{c.flag}</span>
                                      <span className="font-semibold w-16 shrink-0">{c.dial}</span>
                                      <span className="truncate">{c.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiPhone size={15} /></span>
                          <input type="text" placeholder="Phone number" value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9\s\-()]/g, ''))} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  </form>
                  <button type="submit" onClick={handleRegisterSubmit} disabled={loading} className="w-full mt-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-[var(--text-primary)] font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#2563EB]/10">
                    {loading ? 'Creating account...' : 'Create Personal Account'}
                  </button>
                </motion.div>
              )}

              {/* Register Stage — Business Form */}
              {tab === 'register' && regStep === 'business' && (
                <motion.div key="register-business" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <button type="button" onClick={() => setRegStep(null)} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 transition-colors cursor-pointer bg-transparent border-none outline-none">
                      <FiArrowLeft size={14} /> Back to account type
                    </button>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Business Account</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">For companies — manage products, services, and appointments.</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiUser size={15} /></span>
                        <input type="text" placeholder="Alex Mercer" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-muted)] text-sm font-medium">@</span>
                        <input type="text" placeholder="alex" value={regUsername} onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMail size={15} /></span>
                        <input type="email" placeholder="alex@company.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLock size={15} /></span>
                        <input type="password" placeholder="At least 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Company name <span className="text-[var(--text-secondary)]">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiBriefcase size={15} /></span>
                        <input type="text" placeholder="Acme Inc." value={regCompanyName} onChange={(e) => setRegCompanyName(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Tax ID / VAT <span className="text-[var(--text-muted)]">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiFileText size={15} /></span>
                        <input type="text" placeholder="VAT-12345678" value={regTaxId} onChange={(e) => setRegTaxId(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Business address <span className="text-[var(--text-muted)]">(optional)</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMapPin size={15} /></span>
                        <input type="text" placeholder="Street, city, country" value={regBusinessAddress} onChange={(e) => setRegBusinessAddress(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </form>
                  <button type="submit" onClick={handleRegisterSubmit} disabled={loading} className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-blue-500/10">
                    {loading ? 'Creating account...' : 'Create Business Account'}
                  </button>
                </motion.div>
              )}

              {/* Register Stage — Organization Form */}
              {tab === 'register' && regStep === 'organization' && (
                <motion.div key="register-org" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <button type="button" onClick={() => setRegStep(null)} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 transition-colors cursor-pointer bg-transparent border-none outline-none">
                      <FiArrowLeft size={14} /> Back to account type
                    </button>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Organization Account</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">For enterprises — manage orgs, departments, and teams.</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiUser size={15} /></span>
                        <input type="text" placeholder="Alex Mercer" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--text-muted)] text-sm font-medium">@</span>
                        <input type="text" placeholder="alex" value={regUsername} onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMail size={15} /></span>
                        <input type="email" placeholder="alex@org.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLock size={15} /></span>
                        <input type="password" placeholder="At least 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Organization name <span className="text-[var(--text-secondary)]">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLayers size={15} /></span>
                        <input type="text" placeholder="Global NGO" value={regOrgName} onChange={(e) => setRegOrgName(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Industry <span className="text-[var(--text-muted)]">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiFileText size={15} /></span>
                        <input type="text" placeholder="Healthcare, Education..." value={regOrgIndustry} onChange={(e) => setRegOrgIndustry(e.target.value)} className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Org size <span className="text-[var(--text-muted)]">(optional)</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiUsers size={15} /></span>
                        <select value={regOrgSize} onChange={(e) => setRegOrgSize(e.target.value)} className={inputClass}>
                          <option value="">Select size</option>
                          <option value="1-10">1-10</option>
                          <option value="11-50">11-50</option>
                          <option value="51-200">51-200</option>
                          <option value="201-500">201-500</option>
                          <option value="501+">501+</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Description <span className="text-[var(--text-muted)]">(optional)</span></label>
                      <textarea
                        placeholder="Tell us about your organization..."
                        value={regOrgDescription}
                        onChange={(e) => setRegOrgDescription(e.target.value)}
                        className={`${inputClass} resize-none h-20`}
                      />
                    </div>
                  </form>
                  <button type="submit" onClick={handleRegisterSubmit} disabled={loading} className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-blue-500/20">
                    {loading ? 'Creating account...' : 'Create Organization Account'}
                  </button>
                </motion.div>
              )}

              {/* Forgot Password Stage */}
              {tab === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Reset password</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">Receive a 6-digit verification code to recover access.</p>
                  </div>

                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiMail size={15} /></span>
                        <input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className={inputClass} required />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-[var(--text-primary)] font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#2563EB]/10">
                      {loading ? 'Sending...' : 'Send reset code'}
                    </button>

                    <button type="button" onClick={() => setTab('login')} className="block w-full text-center text-xs font-semibold text-[var(--text-muted)] hover:text-[#2563EB] cursor-pointer bg-transparent border-none outline-none mt-4 transition-colors">
                      Back to sign in
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Reset Password Stage */}
              {tab === 'reset' && (
                <motion.div key="reset" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] font-display">Enter new password</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">Check your email for the 6-digit verification code.</p>
                  </div>

                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Verification Code</label>
                      <input type="text" placeholder="123456" value={resetCode} onChange={(e) => setResetCode(e.target.value)} className="w-full bg-[var(--bg-input)] border-[var(--border-color)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/5 transition-all placeholder:text-[var(--text-muted)]" required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)]"><FiLock size={15} /></span>
                        <input type="password" placeholder="At least 6 characters" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} className={inputClass} required />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-[var(--text-primary)] font-bold text-sm rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#2563EB]/10">
                      {loading ? 'Resetting...' : 'Reset password'}
                    </button>

                    <button type="button" onClick={() => setTab('login')} className="block w-full text-center text-xs font-semibold text-[var(--text-muted)] hover:text-[#2563EB] cursor-pointer bg-transparent border-none outline-none mt-4 transition-colors">
                      Back to sign in
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Footer encryption badge */}
          <div className="text-center text-[11px] text-[var(--text-muted)] pt-6 lg:pt-0">
            Protected by end-to-end industry security.
          </div>
        </div>

        {/* Right: Graphic illustration & Branding panel */}
        <div className="col-span-1 lg:col-span-5 bg-[var(--bg-sidebar)]/30 border-t lg:border-t-0 lg:border-l border-[var(--border-color)] p-12 flex flex-col justify-between items-center select-none">
          <div className="w-full text-left space-y-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--bg-sidebar)] border-[var(--border-color)] flex items-center justify-center p-2.5 shadow-lg">
              <img src={appLogo} alt="Aether" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] leading-snug font-display">
                Real-time security,<br />simplified structure.
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                AetherChat integrates channels, direct messaging, video calling, and task management.
              </p>
            </div>
          </div>

          {/* Interactive mockup frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            className="w-full max-w-[280px] aspect-[4/3] rounded-2xl overflow-hidden border-[var(--border-color)] shadow-xl my-8 group"
          >
            <img 
              src={authIllustration} 
              alt="Secured Communications" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
            />
          </motion.div>

          {/* Key lists */}
          <div className="w-full space-y-3 pt-6 border-t border-[var(--border-color)]">
            {[
              { id: '1', title: 'Interactive Workspaces', text: 'Chat, call, and track tasks simultaneously.' },
              { id: '2', title: 'Encrypted signaling', text: 'Decentralized keys secure voice and audio packets.' }
            ].map(item => (
              <div key={item.id} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  <FiCheck size={10} />
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">{item.title}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPages;
