import React, { useState, useEffect, useRef } from 'react';
import type { User, WeightLog, Gender, Group, Invite } from '../types';
import { calculateBMI, calculateAgeFromBirthday } from '../utils/crypto';
import { 
  User as UserIcon, 
  Scale, 
  Calendar, 
  Save, 
  Shield, 
  Trash2, 
  Cake, 
  Camera, 
  Image as ImageIcon,
  Users,
  Eye,
  CheckCircle2,
  Lock,
  RefreshCw,
  LogOut,
  UserPlus,
  Edit2,
  Crown,
  RotateCcw
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 90 }, (_, i) => CURRENT_YEAR - 10 - i);
const MONTHS = [
  { num: '01', name: 'Jan (01)' },
  { num: '02', name: 'Feb (02)' },
  { num: '03', name: 'Mar (03)' },
  { num: '04', name: 'Apr (04)' },
  { num: '05', name: 'May (05)' },
  { num: '06', name: 'Jun (06)' },
  { num: '07', name: 'Jul (07)' },
  { num: '08', name: 'Aug (08)' },
  { num: '09', name: 'Sep (09)' },
  { num: '10', name: 'Oct (10)' },
  { num: '11', name: 'Nov (11)' },
  { num: '12', name: 'Dec (12)' }
];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ProfileSectionProps {
  currentUser: User;
  allUsers?: User[];
  currentGroup?: Group | null;
  myRole?: 'owner' | 'member';
  invites?: Invite[];
  weightLogs: WeightLog[];
  onUpdateProfile: (updatedUser: User, newWeightEntry?: WeightLog) => void;
  onDeleteAccount: (userId: string) => void;
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
  onOpenInviteModal?: () => void;
  onLeaveGroup?: () => Promise<void>;
  onRemoveGroupMember?: (userId: string) => Promise<void>;
  onRevokeInvite?: (token: string) => Promise<boolean>;
  onUpdateGroup?: (groupId: string, data: { name?: string; step_target?: number }) => Promise<boolean>;
  planTier?: 'none' | 'base' | 'pro';
  activeSubscription?: any;
  onOpenUpgradeModal?: (highlightPro?: boolean) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  allUsers,
  currentGroup,
  myRole,
  invites,
  weightLogs,
  onUpdateProfile,
  onDeleteAccount,
  onRefreshMembers,
  isRefreshingMembers = false,
  onOpenInviteModal,
  onLeaveGroup,
  onRemoveGroupMember,
  onRevokeInvite,
  onUpdateGroup,
  planTier = 'none',
  activeSubscription,
  onOpenUpgradeModal,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const targetUser = allUsers?.find(u => u.id === selectedUserId) || currentUser;
  const isViewingOther = targetUser.id !== currentUser.id;

  // Form state for current user
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState<string>(() => String(currentUser.age || 25));
  const [birthday, setBirthday] = useState<string>(() => {
    if (currentUser.birthday) return currentUser.birthday;
    const year = new Date().getFullYear() - (currentUser.age || 25);
    return `${year}-01-01`;
  });
  const [height, setHeight] = useState(String(currentUser.height || 175));
  const [weight, setWeight] = useState(String(currentUser.weight_current || 75));
  const [gender, setGender] = useState<Gender>(currentUser.gender || 'male');
  const [bodyShapePhoto, setBodyShapePhoto] = useState(currentUser.body_shape_photo || '');
  const [isPrivate, setIsPrivate] = useState(currentUser.is_private);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Group editing state (owner only)
  const [groupNameInput, setGroupNameInput] = useState(currentGroup?.name || '');
  const [groupStepTargetInput, setGroupStepTargetInput] = useState(String(currentGroup?.step_target || 10000));
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupSaveSuccess, setGroupSaveSuccess] = useState('');

  useEffect(() => {
    if (currentGroup) {
      setGroupNameInput(currentGroup.name || '');
      setGroupStepTargetInput(String(currentGroup.step_target || 10000));
    }
  }, [currentGroup?.name, currentGroup?.step_target]);

  // Keep state in sync ONLY if currentUser.id changes (switching accounts) to prevent losing active edits
  const lastLoadedUserIdRef = useRef<string>(currentUser.id);
  useEffect(() => {
    if (currentUser && lastLoadedUserIdRef.current !== currentUser.id) {
      lastLoadedUserIdRef.current = currentUser.id;
      setName(currentUser.name);
      setAge(String(currentUser.age || 25));
      if (currentUser.birthday) {
        setBirthday(currentUser.birthday);
      } else {
        const year = new Date().getFullYear() - (currentUser.age || 25);
        setBirthday(`${year}-01-01`);
      }
      setHeight(String(currentUser.height || 175));
      setWeight(String(currentUser.weight_current || 75));
      setGender(currentUser.gender || 'male');
      setBodyShapePhoto(currentUser.body_shape_photo || '');
      setIsPrivate(currentUser.is_private);
    }
  }, [currentUser.id]);

  // Parse birthday parts safely
  const parsedYear = birthday && birthday.length >= 4 ? birthday.slice(0, 4) : String(new Date().getFullYear() - (parseInt(age) || 25));
  const parsedMonth = birthday && birthday.length >= 7 ? birthday.slice(5, 7) : '01';
  const parsedDay = birthday && birthday.length >= 10 ? birthday.slice(8, 10) : '01';

  // Handle direct changes to Day, Month, or Year dropdowns
  const handleDatePartChange = (part: 'day' | 'month' | 'year', val: string) => {
    let y = parsedYear;
    let m = parsedMonth;
    let d = parsedDay;

    if (part === 'year') y = val;
    if (part === 'month') m = val.padStart(2, '0');
    if (part === 'day') d = val.padStart(2, '0');

    // Ensure day doesn't exceed days in month
    const maxDays = new Date(parseInt(y), parseInt(m), 0).getDate();
    if (parseInt(d) > maxDays) {
      d = String(maxDays).padStart(2, '0');
    }

    const newDateStr = `${y}-${m}-${d}`;
    setBirthday(newDateStr);
    const calculated = calculateAgeFromBirthday(newDateStr);
    if (calculated >= 0 && calculated <= 120) {
      setAge(String(calculated));
    }
  };

  // Handle direct age input with automatic birthday derivation while PRESERVING selected month & day
  const handleAgeChange = (val: string) => {
    setAge(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
      const year = new Date().getFullYear() - parsed;
      const m = parsedMonth || '01';
      const d = parsedDay || '01';
      setBirthday(`${year}-${m}-${d}`);
    }
  };

  // Handle birthday date picker change with automatic age derivation
  const handleBirthdayChange = (val: string) => {
    if (!val) return;
    setBirthday(val);
    const calculated = calculateAgeFromBirthday(val);
    if (calculated >= 0 && calculated <= 120) {
      setAge(String(calculated));
    }
  };

  // Live updated BMI whenever height or weight input changes for currentUser
  const parsedAge = parseInt(age) || currentUser.age || 25;
  const parsedHeight = parseFloat(height) || 0;
  const parsedWeight = parseFloat(weight) || 0;

  // Display metrics depending on whether viewing self or teammate
  const displayHeight = isViewingOther ? (targetUser.height || 175) : parsedHeight;
  const displayWeight = isViewingOther ? (targetUser.weight_current || 75) : parsedWeight;
  const displayAge = isViewingOther ? (targetUser.age || 25) : parsedAge;
  const { bmi, category, color } = calculateBMI(displayHeight, displayWeight);

  const userWeightLogs = weightLogs
    .filter(w => w.user_id === targetUser.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBodyShapePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newWeightNum = parsedWeight || currentUser.weight_current;
    const newAgeNum = parseInt(age) || currentUser.age || 25;
    let newWeightEntry: WeightLog | undefined = undefined;

    const todayStr = new Date().toISOString().split('T')[0];

    // If weight changed or no log today, create new timestamped weight log
    if (newWeightNum !== currentUser.weight_current || userWeightLogs.length === 0) {
      newWeightEntry = {
        id: `wl_${currentUser.id}_${Date.now()}`,
        user_id: currentUser.id,
        weight: newWeightNum,
        date: todayStr,
        timestamp: new Date().toISOString(),
      };
    }

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      birthday,
      height: parsedHeight || 175,
      weight_current: newWeightNum,
      age: newAgeNum,
      gender,
      body_shape_photo: bodyShapePhoto,
      is_private: isPrivate,
    };

    onUpdateProfile(updatedUser, newWeightEntry);
    setSaveSuccessMsg(`Profile saved successfully! Age: ${newAgeNum} yrs, Birthday: ${birthday}.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Member Selector Bar - ALWAYS VISIBLE */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/30 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F4F4F5] flex items-center gap-2">
              Member Profile Viewer
              {isViewingOther && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60 font-semibold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Viewing {targetUser.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#A1A1AA]">Inspect your own profile or view teammate profiles and transformation stats</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
            <span className="text-xs font-semibold text-[#A1A1AA] shrink-0">Member:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 sm:w-52 md:w-60 min-h-[42px] bg-[#1B1B20] text-[#F4F4F5] font-bold text-xs border border-[#26262C] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
            >
              {allUsers && allUsers.length > 0 ? (
                allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name} (@${u.username})`}
                  </option>
                ))
              ) : (
                <option value={currentUser.id}>👤 You ({currentUser.name})</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onRefreshMembers && (
              <button
                type="button"
                onClick={onRefreshMembers}
                disabled={isRefreshingMembers}
                title="Sync members from server"
                className="min-h-[40px] px-3 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#D98B4A] rounded-xl border border-[#26262C] transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            )}
            {isViewingOther && (
              <button
                type="button"
                onClick={() => setSelectedUserId(currentUser.id)}
                title="Return to your personal profile"
                className="min-h-[40px] px-3 py-2 bg-[#D98B4A]/20 hover:bg-[#D98B4A]/30 text-[#E69A5C] text-xs font-bold rounded-xl border border-[#D98B4A]/40 transition shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#D98B4A]" />
                <span>Reset to Me</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center gap-5 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-tr from-[#D98B4A] to-[#B45F1E] flex items-center justify-center text-2xl sm:text-3xl font-black text-[#F4F4F5] shadow-lg shadow-[#D98B4A]/20 shrink-0">
          {targetUser.name.charAt(0)}
        </div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-[#F4F4F5] flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span>{targetUser.name}</span>
            {targetUser.is_private && (
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#D98B4A]/20 text-[#E69A5C] font-bold border border-[#D98B4A]/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private Profile
              </span>
            )}
            {targetUser.role === 'admin' && (
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-400 font-bold border border-amber-800/60">
                Admin
              </span>
            )}
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            @{targetUser.username} • Member since {targetUser.created_at || '2026'}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 mt-3 text-xs">
            <span className="bg-[#1B1B20] px-2.5 py-1 rounded-xl border border-[#26262C] text-[#A1A1AA]">
              Height: <strong className="text-[#F4F4F5]">{displayHeight} cm</strong>
            </span>
            <span className="bg-[#1B1B20] px-2.5 py-1 rounded-xl border border-[#26262C] text-[#A1A1AA]">
              Current Weight: <strong className="text-[#E69A5C]">{displayWeight} kg</strong>
            </span>
            <span className="bg-[#1B1B20] px-2.5 py-1 rounded-xl border border-[#26262C] text-[#A1A1AA]">
              Age: <strong className="text-[#F4F4F5]">{displayAge} yrs</strong>
            </span>
          </div>
        </div>

        {/* Live Updating BMI Gauge Card */}
        <div className="w-full md:w-auto bg-[#1B1B20] border border-[#26262C] rounded-xl p-4 sm:p-5 text-center min-w-[170px] shadow-inner">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Live BMI Gauge</span>
          <div className="text-2xl sm:text-3xl font-black text-[#F4F4F5] mt-0.5">{bmi}</div>
          <span className={`text-xs mt-1 inline-block ${color}`}>
            {category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Main Content Area */}
        <div className="md:col-span-2 bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl space-y-6">
          {isViewingOther ? (
            /* Teammate Profile Overview (Read-Only) */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[#D98B4A]" />
                  {targetUser.name}'s Fitness Profile
                </h3>
                <p className="text-xs text-[#A1A1AA] mb-4">
                  Account details and metrics shared across the challenge group.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1B1B20] rounded-xl border border-[#26262C]">
                    <span className="text-xs text-[#A1A1AA] block mb-1">Age & Date of Birth</span>
                    <strong className="text-sm text-[#F4F4F5]">
                      {targetUser.age ? `${targetUser.age} years old` : 'Not specified'}
                      {targetUser.birthday && !targetUser.is_private ? ` (DOB: ${targetUser.birthday})` : ''}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#1B1B20] rounded-xl border border-[#26262C]">
                    <span className="text-xs text-[#A1A1AA] block mb-1">Gender</span>
                    <strong className="text-sm text-[#F4F4F5] capitalize">{targetUser.gender || 'Not specified'}</strong>
                  </div>

                  <div className="p-4 bg-[#1B1B20] rounded-xl border border-[#26262C]">
                    <span className="text-xs text-[#A1A1AA] block mb-1">Target Category</span>
                    <strong className="text-sm text-[#E69A5C]">{category} (BMI: {bmi})</strong>
                  </div>

                  <div className="p-4 bg-[#1B1B20] rounded-xl border border-[#26262C]">
                    <span className="text-xs text-[#A1A1AA] block mb-1">Privacy Level</span>
                    <strong className="text-sm text-[#F4F4F5]">{targetUser.is_private ? 'Private Account' : 'Public Profile'}</strong>
                  </div>
                </div>
              </div>

              {/* Teammate Body Shape Progress Photo */}
              <div className="pt-4 border-t border-[#26262C]">
                <h4 className="text-base font-bold text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D98B4A]" />
                  Transformation Photo
                </h4>
                <div className="bg-[#1B1B20] p-4 rounded-xl border border-[#26262C] flex items-center gap-4">
                  {targetUser.body_shape_photo ? (
                    <img
                      src={targetUser.body_shape_photo}
                      alt={`${targetUser.name}'s progress`}
                      className="w-24 h-32 object-cover rounded-xl border border-[#26262C] shadow"
                    />
                  ) : (
                    <div className="w-24 h-32 rounded-xl bg-[#131316] border border-dashed border-[#26262C] flex flex-col items-center justify-center text-[#A1A1AA] gap-1 shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#D98B4A]" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                  <div className="text-xs text-[#A1A1AA]">
                    <p className="font-semibold text-[#F4F4F5] mb-1">
                      {targetUser.body_shape_photo ? `${targetUser.name} has shared a transformation photo.` : `${targetUser.name} hasn't uploaded a progress photo yet.`}
                    </p>
                    <p>Encourage teammates to update their transformation pictures regularly!</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Current User Edit Form */
            <div>
              <h3 className="text-lg font-black text-[#F4F4F5] mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#D98B4A]" />
                Personal & Health Profile
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full max-w-full min-w-0 box-border block px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] transition"
                  />
                </div>

                {/* Age & Date of Birth Section */}
                <div className="space-y-3 p-3.5 sm:p-4 bg-[#1B1B20]/60 rounded-xl border border-[#26262C]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Age Input */}
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Cake className="w-3.5 h-3.5 text-[#D98B4A]" /> Age (Years)
                        </span>
                        <span className="text-[10px] text-[#71717A]">Auto-syncs with DOB</span>
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => handleAgeChange(e.target.value)}
                        placeholder="e.g. 21"
                        className="w-full max-w-full min-w-0 box-border block px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] font-bold text-sm focus:outline-none focus:border-[#D98B4A] transition"
                      />
                    </div>

                    {/* Quick Native Calendar Picker */}
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-semibold text-[#A1A1AA] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#D98B4A]" /> Calendar Picker
                        </span>
                        <span className="text-[10px] text-[#71717A] truncate">Native mobile/PC</span>
                      </label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => handleBirthdayChange(e.target.value)}
                        className="w-full max-w-full min-w-0 box-border block px-3.5 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] transition cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3-Dropdown Robust DOB Selector (Immune to Mobile Datepicker Bugs & Margin Overflow) */}
                  <div className="pt-2 border-t border-[#26262C]/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#D98B4A]" /> Date of Birth (DOB)
                      </span>
                      {birthday && (
                        <span className="text-[11px] font-bold text-[#D98B4A]">
                          {parsedDay} {MONTH_NAMES[parseInt(parsedMonth) - 1] || parsedMonth} {parsedYear}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Day Select */}
                      <div className="min-w-0">
                        <label className="block text-[10px] text-[#71717A] mb-1 font-medium">Day</label>
                        <select
                          value={parsedDay}
                          onChange={(e) => handleDatePartChange('day', e.target.value)}
                          className="w-full max-w-full min-w-0 box-border block bg-[#131316] text-[#F4F4F5] text-xs font-semibold border border-[#26262C] rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
                        >
                          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                            <option key={d} value={d} className="bg-[#1B1B20] text-[#F4F4F5]">{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Month Select */}
                      <div className="min-w-0">
                        <label className="block text-[10px] text-[#71717A] mb-1 font-medium">Month</label>
                        <select
                          value={parsedMonth}
                          onChange={(e) => handleDatePartChange('month', e.target.value)}
                          className="w-full max-w-full min-w-0 box-border block bg-[#131316] text-[#F4F4F5] text-xs font-semibold border border-[#26262C] rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
                        >
                          {MONTHS.map(m => (
                            <option key={m.num} value={m.num} className="bg-[#1B1B20] text-[#F4F4F5]">{m.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Year Select */}
                      <div className="min-w-0">
                        <label className="block text-[10px] text-[#71717A] mb-1 font-medium">Year</label>
                        <select
                          value={parsedYear}
                          onChange={(e) => handleDatePartChange('year', e.target.value)}
                          className="w-full max-w-full min-w-0 box-border block bg-[#131316] text-[#F4F4F5] text-xs font-semibold border border-[#26262C] rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
                        >
                          {YEARS.map(y => (
                            <option key={y} value={String(y)} className="bg-[#1B1B20] text-[#F4F4F5]">{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 175"
                      className="w-full px-3.5 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 75"
                      className="w-full px-3.5 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] transition"
                  >
                    <option value="male" className="bg-[#1B1B20] text-[#F4F4F5]">Male</option>
                    <option value="female" className="bg-[#1B1B20] text-[#F4F4F5]">Female</option>
                    <option value="other" className="bg-[#1B1B20] text-[#F4F4F5]">Other / Unspecified</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#1B1B20]/80 rounded-xl border border-[#26262C]">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-[#D98B4A]" />
                    <div>
                      <span className="text-xs font-bold text-[#F4F4F5] block">Profile Privacy</span>
                      <span className="text-[11px] text-[#A1A1AA]">Keep personal weight & log updates private</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isPrivate
                        ? 'bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/40'
                        : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
                    }`}
                  >
                    {isPrivate ? 'Private' : 'Public'}
                  </button>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] font-black rounded-xl text-sm transition shadow-lg shadow-[#D98B4A]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Profile & Update Body Metrics
                </button>
              </form>

              {/* Body Shape Progress Photo Section */}
              <div className="pt-4 border-t border-[#26262C] mt-6">
                <h4 className="text-base font-bold text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D98B4A]" />
                  Body Shape Progress Photo
                </h4>
                <p className="text-xs text-[#A1A1AA] mb-3">
                  Upload a progress photo to track your physical transformation over time.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1B1B20] p-4 rounded-xl border border-[#26262C]">
                  {bodyShapePhoto ? (
                    <img
                      src={bodyShapePhoto}
                      alt="Body Shape Progress"
                      className="w-24 h-32 object-cover rounded-xl border border-[#26262C] shadow"
                    />
                  ) : (
                    <div className="w-24 h-32 rounded-xl bg-[#131316] border border-dashed border-[#26262C] flex flex-col items-center justify-center text-[#A1A1AA] gap-1 shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#D98B4A]" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#F4F4F5] border border-[#26262C] rounded-xl text-xs font-bold transition cursor-pointer">
                      <Camera className="w-4 h-4 text-[#D98B4A]" />
                      <span>Upload New Progress Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {bodyShapePhoto && (
                      <button
                        type="button"
                        onClick={() => setBodyShapePhoto('')}
                        className="block text-xs text-rose-400 hover:underline font-semibold mt-1"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timestamped Weight History Log & Delete Account Card */}
        <div className="space-y-4 sm:space-y-6 flex flex-col min-w-0">
          <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl flex flex-col min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#D98B4A]" />
              {isViewingOther ? `${targetUser.name}'s Weight Log` : 'Weight History Log'}
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2 pr-1">
              {userWeightLogs.length === 0 ? (
                <p className="text-xs text-[#A1A1AA] italic py-2">No weight entries logged yet.</p>
              ) : (
                userWeightLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 bg-[#1B1B20] rounded-xl border border-[#26262C] text-xs"
                  >
                    <div className="flex items-center gap-2 text-[#A1A1AA]">
                      <Calendar className="w-3.5 h-3.5 text-[#B45F1E]" />
                      <span>{log.date}</span>
                    </div>
                    <strong className="text-[#F4F4F5] font-mono text-sm">{log.weight} kg</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Membership & Billing Card (Only shown when viewing own profile) */}
          {!isViewingOther && (
            <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 shadow-xl space-y-4 min-w-0 overflow-hidden">
              <div className="flex flex-col gap-3 pb-3 border-b border-[#26262C]">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    planTier === 'pro'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-[#FBBF24]'
                      : planTier === 'base'
                      ? 'bg-[#D98B4A]/15 border border-[#D98B4A]/30 text-[#D98B4A]'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                  }`}>
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#F4F4F5]">Membership & Billing</h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        planTier === 'pro'
                          ? 'bg-gradient-to-r from-[#D98B4A] to-[#F59E0B] text-[#0B0B0D]'
                          : planTier === 'base'
                          ? 'bg-[rgba(217,139,74,0.15)] text-[#D98B4A] border border-[#D98B4A]/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {planTier === 'pro' ? '★ PRO MEMBER' : planTier === 'base' ? 'BASE (SOLO)' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1 break-words">
                      {planTier === 'pro' 
                        ? 'Unlimited group members, head-to-head battles, rankings & shared goals.'
                        : planTier === 'base'
                        ? '₹49/month • Solo fitness tracking. Upgrade to Pro for group formation & challenges.'
                        : 'No active plan. Select a membership to unlock habit tracking.'}
                    </p>
                  </div>
                </div>

                {onOpenUpgradeModal && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenUpgradeModal(planTier === 'base')}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                        planTier === 'pro'
                          ? 'bg-[#1B1B20] hover:bg-[#26262C] text-[#F4F4F5] border border-[#3F3F46]'
                          : 'bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] hover:from-[#B45F1E] hover:to-[#8E4410] text-[#0B0B0D] font-extrabold shadow-[#D98B4A]/20'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span>{planTier === 'pro' ? 'Manage Plan' : planTier === 'base' ? 'Upgrade to Pro' : 'Activate Membership'}</span>
                    </button>
                  </div>
                )}
              </div>

              {activeSubscription && (
                <div className="flex flex-wrap items-center justify-between text-xs text-[#A1A1AA] pt-1">
                  <span>Current Plan: <strong className="text-[#F4F4F5]">{activeSubscription.plan?.name || (planTier === 'pro' ? 'PULSE Pro' : 'PULSE Base')}</strong></span>
                  {activeSubscription.expires_at && (
                    <span>Valid until: <strong className="text-[#F4F4F5] font-mono">{new Date(activeSubscription.expires_at).toLocaleDateString()}</strong></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Group Settings Panel (Only shown when viewing own profile) */}
          {!isViewingOther && (
            <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 shadow-xl space-y-4 min-w-0 overflow-hidden">
              
              {/* Pro Plan Exclusive Notice for Base Users */}
              {planTier === 'base' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FBBF24]">
                    <Lock className="w-4 h-4 text-[#FBBF24]" />
                    <span>Group Formation & Invites are exclusive to PULSE Pro</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    You are on the Base Solo plan (₹49/mo). Upgrade to PULSE Pro to form groups, invite teammates of any group size, and unlock head-to-head battles and team leaderboards. (Note: all joining teammates must also have an active Pro plan).
                  </p>
                  {onOpenUpgradeModal && (
                    <button
                      type="button"
                      onClick={() => onOpenUpgradeModal(true)}
                      className="mt-1 px-3.5 py-1.5 bg-[#D98B4A] hover:bg-[#B45F1E] text-[#0B0B0D] font-extrabold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Upgrade to Pro (from ₹149/mo)</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 pb-3 border-b border-[#26262C]">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#D98B4A]/15 border border-[#D98B4A]/30 flex items-center justify-center text-[#D98B4A] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#F4F4F5] truncate">
                        {currentGroup?.name || 'My Group'}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        myRole === 'owner' 
                          ? 'bg-[#D98B4A]/20 text-[#D98B4A] border border-[#D98B4A]/30'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {myRole === 'owner' ? 'Group Owner' : 'Member'}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      {currentGroup?.members?.length || 1} {(currentGroup?.members?.length || 1) === 1 ? 'member' : 'members'} · Daily Target: <span className="text-[#F4F4F5] font-semibold tabular-nums">{(currentGroup?.step_target || 10000).toLocaleString()}</span> steps
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {myRole === 'owner' && onUpdateGroup && (
                    <button
                      type="button"
                      onClick={() => setIsEditingGroup(prev => !prev)}
                      className="flex-1 min-w-[120px] px-3 py-2 bg-[#26262C] hover:bg-[#32323A] text-[#F4F4F5] border border-[#3A3A44] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#D98B4A]" />
                      <span>{isEditingGroup ? 'Close Edit' : 'Edit Group & Target'}</span>
                    </button>
                  )}
                  {onOpenInviteModal && (
                    <button
                      type="button"
                      onClick={onOpenInviteModal}
                      className="flex-1 min-w-[120px] px-3 py-2 bg-[#D98B4A]/15 hover:bg-[#D98B4A]/25 text-[#D98B4A] border border-[#D98B4A]/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Invite Friends</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Owner Edit Form (Group Name & Group Step Target) */}
              {myRole === 'owner' && isEditingGroup && onUpdateGroup && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!currentGroup) return;
                    setIsSavingGroup(true);
                    setGroupSaveSuccess('');
                    const ok = await onUpdateGroup(currentGroup.id, {
                      name: groupNameInput.trim() || currentGroup.name,
                      step_target: Math.max(1000, parseInt(groupStepTargetInput) || 10000),
                    });
                    setIsSavingGroup(false);
                    if (ok) {
                      setGroupSaveSuccess('Group name and daily step target updated successfully!');
                      setTimeout(() => setGroupSaveSuccess(''), 4000);
                    }
                  }}
                  className="bg-[#1B1B20] border border-[#D98B4A]/30 rounded-xl p-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#D98B4A] flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Group Configuration (Owner Controls)</span>
                    </h4>
                    {groupSaveSuccess && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{groupSaveSuccess}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={groupNameInput}
                        onChange={(e) => setGroupNameInput(e.target.value)}
                        placeholder="e.g. Iron Legion, Sunrise Runners"
                        className="w-full px-3 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D98B4A]"
                        required
                        minLength={2}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                        Daily Step Target (For all members)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="500"
                          min="1000"
                          max="100000"
                          value={groupStepTargetInput}
                          onChange={(e) => setGroupStepTargetInput(e.target.value)}
                          className="w-full px-3 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-xs text-[#F4F4F5] font-mono tabular-nums focus:outline-none focus:border-[#D98B4A]"
                          required
                        />
                        <span className="text-xs text-[#A1A1AA] font-bold shrink-0">steps</span>
                      </div>
                    </div>
                  </div>

                  {/* Step Target Presets */}
                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1.5">
                      Quick Step Presets:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[6000, 8000, 10000, 12000, 15000].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setGroupStepTargetInput(String(cnt))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            Number(groupStepTargetInput) === cnt
                              ? 'bg-[#D98B4A]/20 text-[#D98B4A] border-[#D98B4A]/40'
                              : 'bg-[#131316] hover:bg-[#26262C] text-[#A1A1AA] border-[#26262C]'
                          }`}
                        >
                          {cnt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] mt-1.5">
                      💡 Partial points for daily steps are awarded proportionally up to 10 points based on this group target.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGroupNameInput(currentGroup?.name || '');
                        setGroupStepTargetInput(String(currentGroup?.step_target || 10000));
                        setIsEditingGroup(false);
                      }}
                      className="px-3.5 py-1.5 bg-[#131316] hover:bg-[#26262C] text-[#A1A1AA] text-xs font-semibold rounded-lg border border-[#26262C] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingGroup}
                      className="px-4 py-1.5 bg-[#D98B4A] hover:bg-[#B45F1E] disabled:opacity-50 text-[#131316] font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingGroup ? 'Saving...' : 'Save Group Settings'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Group Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                  Group Members
                </h4>
                <div className="divide-y divide-[#26262C] bg-[#1B1B20] border border-[#26262C] rounded-xl overflow-hidden">
                  {(currentGroup?.members || []).map(member => (
                    <div key={member.user_id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#131316] border border-[#26262C] flex items-center justify-center font-bold text-xs text-[#F4F4F5] shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#F4F4F5] truncate flex items-center gap-1.5">
                            {member.name}
                            {member.user_id === currentUser.id && <span className="text-[10px] text-[#A1A1AA] font-normal">(You)</span>}
                          </p>
                          <p className="text-[10px] text-[#A1A1AA] font-mono">@{member.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          member.role === 'owner'
                            ? 'bg-[#D98B4A]/20 text-[#D98B4A] border border-[#D98B4A]/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {member.role === 'owner' ? 'Owner' : 'Member'}
                        </span>

                        {/* Owner can remove other members */}
                        {myRole === 'owner' && member.user_id !== currentUser.id && onRemoveGroupMember && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                                onRemoveGroupMember(member.user_id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-500/10 text-[#A1A1AA] hover:text-rose-400 rounded-lg transition cursor-pointer"
                            title="Remove from group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Invites for Owner */}
              {myRole === 'owner' && (invites || []).filter(i => !i.revoked).length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                    Active Invites ({(invites || []).filter(i => !i.revoked).length})
                  </h4>
                  <div className="space-y-2">
                    {(invites || []).filter(i => !i.revoked).map(inv => (
                      <div key={inv.token} className="p-2.5 bg-[#1B1B20] border border-[#26262C] rounded-xl flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[#F4F4F5] truncate text-[11px]">{inv.token}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#A1A1AA]">{inv.uses}/{inv.max_uses} used</span>
                          {onRevokeInvite && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Revoke this invite?')) {
                                  onRevokeInvite(inv.token);
                                }
                              }}
                              className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Group Button with Confirmation */}
              <div className="pt-3 border-t border-[#26262C]">
                {!showLeaveConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#FBBF24] border border-amber-500/25 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Group</span>
                  </button>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-[#FBBF24]">
                      {myRole === 'owner' && (currentGroup?.members?.length || 1) > 1
                        ? 'As the group owner, leaving will transfer ownership to the next earliest member. Confirm?'
                        : 'Are you sure you want to leave this group? You will be placed in your own private group.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (onLeaveGroup) {
                            await onLeaveGroup();
                            setShowLeaveConfirm(false);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#D98B4A] hover:bg-[#B45F1E] text-[#131316] font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Yes, Leave Group
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLeaveConfirm(false)}
                        className="px-3.5 py-1.5 bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete My Account Section (Only shown when viewing own profile) */}
          {!isViewingOther && (
            <div className="bg-[#131316] border border-rose-900/40 rounded-xl p-4 sm:p-6 shadow-xl space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                Delete Account
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Permanently delete your account (@{currentUser.username}). You can only delete your own account.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete My Account
                </button>
              ) : (
                <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-rose-200">
                    Are you sure you want to permanently delete your account? This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onDeleteAccount(currentUser.id)}
                      className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-900/40"
                    >
                      Yes, Delete My Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-[#1B1B20] hover:bg-[#1B1B20] text-[#A1A1AA] rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
