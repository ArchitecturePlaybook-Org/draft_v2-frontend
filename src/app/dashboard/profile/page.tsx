"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/domains/auth/api";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user?.profile) {
      setMetadata(user.profile.metadata || {});
      setBio(user.profile.bio || "");
      setPhone(user.profile.phone_number || "");
    }
  }, [user]);

  async function handleUpdate() {
    setIsLoading(true);
    setSuccess("");
    try {
      const updatedProfile = await authApi.updateProfile({
        bio,
        phone_number: phone,
        metadata,
      });
      
      // Update store
      if (user) {
        setUser({
          ...user,
          profile: updatedProfile
        });
      }
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      {/* Profile Header */}
      <div className="relative group">
        <div className="h-48 w-full bg-surface-100 rounded-2xl arch-grid opacity-20 border border-surface-200" />
        <div className="absolute -bottom-10 left-10 flex items-end gap-6">
          <div className="w-32 h-32 rounded-2xl bg-white p-2 shadow-xl border border-surface-100">
             <div className="w-full h-full rounded-xl bg-primary flex items-center justify-center text-4xl text-white font-bold">
                {user.name.charAt(0)}
             </div>
          </div>
          <div className="pb-4">
            <h1 className="text-3xl font-bold text-primary">{user.name}</h1>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold uppercase tracking-widest text-accent">{user.user_type}</span>
                <span className="text-surface-600">•</span>
                <span className="text-sm text-surface-600">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-16">
        {/* Left Col: Main Info */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 border border-surface-200 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-primary uppercase tracking-tighter">Identity Specification</h2>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-xs font-bold uppercase text-accent border-b border-accent"
                    >
                        {isEditing ? "Cancel" : "Edit Specification"}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-surface-600 uppercase tracking-widest">Biography</label>
                        {isEditing ? (
                            <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full h-32 p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent"
                            />
                        ) : (
                            <p className="text-primary leading-relaxed">{bio || "No biography provided."}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-surface-600 uppercase tracking-widest">Phone Contact</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent"
                                />
                            ) : (
                                <p className="font-medium text-primary">{phone || "Not specified"}</p>
                            )}
                        </div>
                   </div>
                </div>

                {isEditing && (
                    <div className="pt-6 border-t border-surface-100 flex justify-end">
                        <button 
                            onClick={handleUpdate}
                            disabled={isLoading}
                            className="px-8 h-12 bg-primary text-white font-bold uppercase text-xs tracking-widest hover:bg-accent transition-all"
                        >
                            {isLoading ? "Synchronizing..." : "Save Changes"}
                        </button>
                    </div>
                )}
                {success && <p className="text-green-600 text-sm font-medium">{success}</p>}
            </section>
        </div>

        {/* Right Col: Metadata Specs */}
        <div className="space-y-8">
            <section className="bg-surface-800 text-white p-8 rounded-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 arch-grid opacity-10" />
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] opacity-40">Professional Metadata</h2>
                
                <div className="space-y-6">
                    {Object.entries(metadata).length > 0 ? (
                        Object.entries(metadata).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                                <label className="text-[10px] font-bold uppercase opacity-30">{key.replace('_', ' ')}</label>
                                {isEditing ? (
                                    <input 
                                        type="text"
                                        value={typeof value === 'string' ? value : JSON.stringify(value)}
                                        onChange={(e) => setMetadata({...metadata, [key]: e.target.value})}
                                        className="w-full bg-white/10 border border-white/20 p-2 rounded text-sm text-white outline-none focus:border-accent"
                                    />
                                ) : (
                                    <p className="text-sm font-medium tracking-tight">
                                        {Array.isArray(value) ? value.join(", ") : value.toString()}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs opacity-40 italic">No specialized metadata linked to this profile type.</p>
                    )}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
}
