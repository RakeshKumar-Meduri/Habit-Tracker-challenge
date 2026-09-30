import React, { useState } from 'react';
import type { User, WeightLog, Gender } from '../types';
import { calculateBMI, calculateAgeFromBirthday } from '../utils/crypto';
import { User as UserIcon, Scale, Calendar, Save, Shield, Trash2, Cake, Camera, Image as ImageIcon } from 'lucide-react';

interface ProfileSectionProps {
  currentUser: User;
  weightLogs: WeightLog[];
  onUpdateProfile: (updatedUser: User, newWeightEntry?: WeightLog) => void;
  onDeleteAccount: (userId: string) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  weightLogs,
  onUpdateProfile,
  onDeleteAccount,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [birthday, setBirthday] = useState(currentUser.birthday || '1998-05-15');
  const [height, setHeight] = useState(String(currentUser.height || 175));
  const [weight, setWeight] = useState(String(currentUser.weight_current || 75));
  const [gender, setGender] = useState<Gender>(currentUser.gender || 'male');
  const [bodyShapePhoto, setBodyShapePhoto] = useState(currentUser.body_shape_photo || '');
  const [isPrivate, setIsPrivate] = useState(currentUser.is_private);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Live calculated age from birthday
  const calculatedAge = calculateAgeFromBirthday(birthday);

  // Live updated BMI whenever height or weight input changes
  const parsedHeight = parseFloat(height) || 0;
  const parsedWeight = parseFloat(weight) || 0;
  const { bmi, category, color } = calculateBMI(parsedHeight, parsedWeight);

  const userWeightLogs = weightLogs
    .filter(w => w.user_id === currentUser.id)
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
      age: calculatedAge,
      gender,
      body_shape_photo: bodyShapePhoto,
      is_private: isPrivate,
    };

    onUpdateProfile(updatedUser, newWeightEntry);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Profile Header */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#c68b59] to-[#785338] flex items-center justify-center text-3xl font-black text-[#f5efe6] shadow-lg shadow-[#c68b59]/20">
          {currentUser.name.charAt(0)}
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-black text-[#f5efe6] flex items-center justify-center md:justify-start gap-2">
            {currentUser.name}
            {currentUser.is_private && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#c68b59]/20 text-[#d4a373] font-bold border border-[#c68b59]/30">
                Private Profile
              </span>
            )}
          </h2>
          <p className="text-xs text-[#c5b4a5] mt-1">
            @{currentUser.username} • Member since {currentUser.created_at}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs">
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Height: <strong className="text-[#f5efe6]">{parsedHeight} cm</strong>
            </span>
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Current Weight: <strong className="text-[#d4a373]">{parsedWeight} kg</strong>
            </span>
            <span className="bg-[#1c1815] px-3 py-1 rounded-xl border border-[#3d322a] text-[#c5b4a5]">
              Age: <strong className="text-[#f5efe6]">{calculatedAge} yrs</strong>
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
        
        {/* Edit Form */}
        <div className="md:col-span-2 bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl space-y-6">
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
                    <Cake className="w-3.5 h-3.5 text-[#c68b59]" /> Birthday
                  </label>
                  <input
                    type="date"
                    required
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Calculated Age</label>
                  <div className="w-full px-3.5 py-2 bg-[#1c1815]/70 border border-[#3d322a] rounded-xl text-[#d4a373] font-bold text-sm">
                    {calculatedAge} years old
                  </div>
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

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Profile & Update Body Metrics
              </button>
            </form>
          </div>

          {/* Body Shape Progress Photo Section */}
          <div className="pt-4 border-t border-[#3d322a]">
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

        {/* Timestamped Weight History Log & Delete Account Card */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="text-base font-bold text-[#f5efe6] mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#c68b59]" />
              Weight History Log
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

          {/* Delete My Account Section */}
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
        </div>

      </div>

    </div>
  );
};
