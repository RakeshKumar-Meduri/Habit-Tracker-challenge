import React, { useState, useEffect } from 'react';
import type { User, WeightLog, Gender } from '../types';
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
  Lock
} from 'lucide-react';

interface ProfileSectionProps {
  currentUser: User;
  allUsers?: User[];
  weightLogs: WeightLog[];
  onUpdateProfile: (updatedUser: User, newWeightEntry?: WeightLog) => void;
  onDeleteAccount: (userId: string) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  allUsers,
  weightLogs,
  onUpdateProfile,
  onDeleteAccount,
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
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Keep state in sync if currentUser updates
  useEffect(() => {
    if (currentUser) {
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
  }, [currentUser.id, currentUser.age, currentUser.height, currentUser.weight_current, currentUser.name, currentUser.gender, currentUser.birthday]);

  // Handle direct age input with automatic birthday derivation
  const handleAgeChange = (val: string) => {
    setAge(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
      const year = new Date().getFullYear() - parsed;
      const md = birthday && birthday.length >= 10 ? birthday.slice(5) : '01-01';
      setBirthday(`${year}-${md}`);
    }
  };

  // Handle birthday date picker change with automatic age derivation
  const handleBirthdayChange = (val: string) => {
    setBirthday(val);
    const calculated = calculateAgeFromBirthday(val);
    if (calculated > 0) {
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
    setSaveSuccessMsg(`Profile saved successfully! Age updated to ${newAgeNum} yrs.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Member Selector Bar */}
      {allUsers && allUsers.length > 1 && (
        <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f5efe6] flex items-center gap-2">
                Member Profile Viewer
                {isViewingOther && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60 font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Viewing {targetUser.name}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#c5b4a5]">Inspect your own profile or view teammate profiles and transformation stats</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#c5b4a5] shrink-0">Member:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full sm:w-auto bg-[#1c1815] text-[#f5efe6] font-bold text-xs border border-[#3d322a] rounded-xl px-3 py-2 focus:outline-none focus:border-[#c68b59] cursor-pointer"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name} (@${u.username})`}
                </option>
              ))}
            </select>
            {isViewingOther && (
              <button
                type="button"
                onClick={() => setSelectedUserId(currentUser.id)}
                className="px-2.5 py-2 bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold rounded-xl border border-[#c68b59]/30 transition shrink-0 cursor-pointer"
              >
                Reset to Me
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#c68b59] to-[#785338] flex items-center justify-center text-3xl font-black text-[#f5efe6] shadow-lg shadow-[#c68b59]/20">
          {targetUser.name.charAt(0)}
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-black text-[#f5efe6] flex items-center justify-center md:justify-start gap-2">
            {targetUser.name}
            {targetUser.is_private && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#c68b59]/20 text-[#d4a373] font-bold border border-[#c68b59]/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private Profile
              </span>
            )}
            {targetUser.role === 'admin' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-400 font-bold border border-amber-800/60">
                Admin
              </span>
            )}
          </h2>
          <p className="text-xs text-[#c5b4a5] mt-1">
            @{targetUser.username} • Member since {targetUser.created_at || '2026'}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs">
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Height: <strong className="text-[#f5efe6]">{displayHeight} cm</strong>
            </span>
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Current Weight: <strong className="text-[#d4a373]">{displayWeight} kg</strong>
            </span>
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Age: <strong className="text-[#f5efe6]">{displayAge} yrs</strong>
            </span>
          </div>
        </div>

        {/* Live Updating BMI Gauge Card */}
        <div className="bg-[#1c1815] border border-[#3d322a] rounded-2xl p-5 text-center min-w-[170px] shadow-inner">
          <span className="text-[11px] font-semibold text-[#c5b4a5] uppercase tracking-wider block">Live BMI Gauge</span>
          <div className="text-3xl font-black text-[#f5efe6] mt-1">{bmi}</div>
          <span className={`text-xs mt-1 inline-block ${color}`}>
            {category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="md:col-span-2 bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl space-y-6">
          {isViewingOther ? (
            /* Teammate Profile Overview (Read-Only) */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#f5efe6] mb-3 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[#c68b59]" />
                  {targetUser.name}'s Fitness Profile
                </h3>
                <p className="text-xs text-[#c5b4a5] mb-4">
                  Account details and metrics shared across the challenge group.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1c1815] rounded-xl border border-[#3d322a]">
                    <span className="text-xs text-[#c5b4a5] block mb-1">Gender</span>
                    <strong className="text-sm text-[#f5efe6] capitalize">{targetUser.gender || 'Not specified'}</strong>
                  </div>

                  <div className="p-4 bg-[#1c1815] rounded-xl border border-[#3d322a]">
                    <span className="text-xs text-[#c5b4a5] block mb-1">Account Status</span>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Active Challenge Member
                    </div>
                  </div>

                  <div className="p-4 bg-[#1c1815] rounded-xl border border-[#3d322a]">
                    <span className="text-xs text-[#c5b4a5] block mb-1">Target Category</span>
                    <strong className="text-sm text-[#d4a373]">{category} (BMI: {bmi})</strong>
                  </div>

                  <div className="p-4 bg-[#1c1815] rounded-xl border border-[#3d322a]">
                    <span className="text-xs text-[#c5b4a5] block mb-1">Privacy Level</span>
                    <strong className="text-sm text-[#f5efe6]">{targetUser.is_private ? 'Private Account' : 'Public Profile'}</strong>
                  </div>
                </div>
              </div>

              {/* Teammate Body Shape Progress Photo */}
              <div className="pt-4 border-t border-[#3d322a]">
                <h4 className="text-base font-bold text-[#f5efe6] mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#c68b59]" />
                  Transformation Photo
                </h4>
                <div className="bg-[#1c1815] p-4 rounded-xl border border-[#3d322a] flex items-center gap-4">
                  {targetUser.body_shape_photo ? (
                    <img
                      src={targetUser.body_shape_photo}
                      alt={`${targetUser.name}'s progress`}
                      className="w-24 h-32 object-cover rounded-xl border border-[#3d322a] shadow"
                    />
                  ) : (
                    <div className="w-24 h-32 rounded-xl bg-[#26201b] border border-dashed border-[#3d322a] flex flex-col items-center justify-center text-[#c5b4a5] gap-1 shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#c68b59]" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                  <div className="text-xs text-[#c5b4a5]">
                    <p className="font-semibold text-[#f5efe6] mb-1">
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
              <h3 className="text-lg font-black text-[#f5efe6] mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#c68b59]" />
                Personal & Health Profile
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1.5">
                      <Cake className="w-3.5 h-3.5 text-[#c68b59]" /> Age (Years)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      required
                      value={age}
                      onChange={(e) => handleAgeChange(e.target.value)}
                      placeholder="e.g. 19"
                      className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] font-bold text-sm focus:outline-none focus:border-[#c68b59] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#c68b59]" /> Birthday (Optional)
                    </label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => handleBirthdayChange(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 175"
                      className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 75"
                      className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition"
                  >
                    <option value="male" className="bg-[#1c1815] text-[#f5efe6]">Male</option>
                    <option value="female" className="bg-[#1c1815] text-[#f5efe6]">Female</option>
                    <option value="other" className="bg-[#1c1815] text-[#f5efe6]">Other / Unspecified</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#1c1815]/80 rounded-xl border border-[#3d322a]">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-[#c68b59]" />
                    <div>
                      <span className="text-xs font-bold text-[#f5efe6] block">Profile Privacy</span>
                      <span className="text-[11px] text-[#c5b4a5]">Keep personal weight & log updates private</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isPrivate
                        ? 'bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/40'
                        : 'bg-[#322a24] text-[#c5b4a5] border border-[#3d322a]'
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
                  className="w-full py-3 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Profile & Update Body Metrics
                </button>
              </form>

              {/* Body Shape Progress Photo Section */}
              <div className="pt-4 border-t border-[#3d322a] mt-6">
                <h4 className="text-base font-bold text-[#f5efe6] mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#c68b59]" />
                  Body Shape Progress Photo
                </h4>
                <p className="text-xs text-[#c5b4a5] mb-3">
                  Upload a progress photo to track your physical transformation over time.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1c1815] p-4 rounded-xl border border-[#3d322a]">
                  {bodyShapePhoto ? (
                    <img
                      src={bodyShapePhoto}
                      alt="Body Shape Progress"
                      className="w-24 h-32 object-cover rounded-xl border border-[#3d322a] shadow"
                    />
                  ) : (
                    <div className="w-24 h-32 rounded-xl bg-[#26201b] border border-dashed border-[#3d322a] flex flex-col items-center justify-center text-[#c5b4a5] gap-1 shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#c68b59]" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#322a24] hover:bg-[#3d322a] text-[#f5efe6] border border-[#3d322a] rounded-xl text-xs font-bold transition cursor-pointer">
                      <Camera className="w-4 h-4 text-[#c68b59]" />
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
        <div className="space-y-6 flex flex-col">
          <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="text-base font-bold text-[#f5efe6] mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#c68b59]" />
              {isViewingOther ? `${targetUser.name}'s Weight Log` : 'Weight History Log'}
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2 pr-1">
              {userWeightLogs.length === 0 ? (
                <p className="text-xs text-[#c5b4a5] italic py-2">No weight entries logged yet.</p>
              ) : (
                userWeightLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 bg-[#1c1815] rounded-xl border border-[#3d322a] text-xs"
                  >
                    <div className="flex items-center gap-2 text-[#c5b4a5]">
                      <Calendar className="w-3.5 h-3.5 text-[#a06738]" />
                      <span>{log.date}</span>
                    </div>
                    <strong className="text-[#f5efe6] font-mono text-sm">{log.weight} kg</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Delete My Account Section (Only shown when viewing own profile) */}
          {!isViewingOther && (
            <div className="bg-[#26201b] border border-rose-900/40 rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                Delete Account
              </h3>
              <p className="text-xs text-[#c5b4a5]">
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
                      className="px-4 py-2 bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] rounded-xl text-xs font-bold transition cursor-pointer"
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
