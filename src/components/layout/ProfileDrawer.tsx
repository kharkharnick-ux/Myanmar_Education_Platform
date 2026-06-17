import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { X, User, Mail, Phone, ShieldCheck, Calendar, Edit2, Loader2, Check, Camera, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui-kit/GlassCard";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    avatar_url?: string;
    created_at?: string;
  };
}

export function ProfileDrawer({ open, onOpenChange, user }: ProfileDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setIsEditing(false);
    }
  }, [open, user]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("အကောင့်ဝင်ရန် လိုအပ်ပါသည်။");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setIsEditing(false);
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Image file ပဲ တင်နိုင်ပါတယ်");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("5MB အောက်ပုံသာ တင်နိုင်ပါတယ်");
      return;
    }

    try {
      setUploading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("User not found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: "3600",
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', authUser.id);

      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("ကိုယ်ရေးအချက်အလက်ပုံကို ဖျက်ရန် သေချာပါသလား?")) return;

    try {
      setUploading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("User not found");

      // Storage ထဲမှ ပုံကိုဖျက်ရန်
      if (user.avatar_url) {
        const fileName = user.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('avatars').remove([fileName]);
        }
      }

      // Database တွင် link ကို null လုပ်ရန်
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', authUser.id);

      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none focus:ring-0">
          <div className="glass-strong flex flex-col p-6 shadow-2xl rounded-3xl">
            <div className="mb-8 flex items-center justify-between">
              <Drawer.Title className="text-xl font-bold glow-text">ကိုယ်ရေးအချက်အလက်</Drawer.Title>
              <button onClick={() => onOpenChange(false)} className="glass p-2 rounded-xl hover:scale-110 transition-transform">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6 group">
                {/* Outer Ambient Glow */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
                
                <div className="relative p-1.5 rounded-[2.5rem] glass-panel bg-white/5 border border-white/10 shadow-2xl">
                  <div className="relative grid h-28 w-28 place-items-center rounded-[2.2rem] bg-gradient-to-br from-[oklch(0.75_0.20_225)] to-[oklch(0.55_0.25_260)] text-3xl font-bold text-white overflow-hidden shadow-inner">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      user.full_name.substring(0, 2).toUpperCase()
                    )}
                    {uploading && (
                      <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-md">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />

                {/* Delete Button - Bottom Left */}
                {user.avatar_url && (
                  <div className="absolute -bottom-2 -left-2 scale-90 group-hover:scale-100 transition-transform duration-300">
                    <button 
                      onClick={handleDeleteAvatar}
                      disabled={uploading}
                      className="glass-strong p-2.5 rounded-2xl text-destructive hover:bg-destructive hover:text-white shadow-xl transition-all disabled:opacity-50 border border-white/10"
                      title="ပုံဖျက်ရန်"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Upload Button - Bottom Right */}
                <div className="absolute -bottom-2 -right-2 scale-90 group-hover:scale-100 transition-transform duration-300">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="glass-strong p-2.5 rounded-2xl text-[var(--neon)] shadow-xl hover:scale-110 transition-all disabled:opacity-50 border border-white/10"
                    title="ပုံတင်ရန်"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>

            <div className="space-y-4 flex-1">
              {[
                { id: "name", icon: User, label: "အမည်အပြည့်အစုံ", value: user.full_name, current: fullName, setter: setFullName, editable: true },
                { id: "email", icon: Mail, label: "Email လိပ်စာ", value: user.email, editable: false },
                { id: "phone", icon: Phone, label: "ဖုန်းနံပါတ်", value: user.phone || "မသတ်မှတ်ရသေးပါ", current: phone, setter: setPhone, editable: true },
                { id: "role", icon: ShieldCheck, label: "တာဝန်", value: user.role, editable: false },
                { 
                  id: "date",
                  icon: Calendar, 
                  label: "စတင်အသုံးပြုသည့်ရက်", 
                  value: user.created_at ? new Date(user.created_at).toLocaleDateString('my-MM', { year: 'numeric', month: 'long' }) : "မသိရသေးပါ",
                  editable: false
                },
              ].map((item, i) => (
                <div key={i} className="glass-panel flex items-center gap-4 p-4 transition-all hover:bg-white/5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</div>
                    {isEditing && item.editable ? (
                      <input 
                        type="text"
                        value={item.current}
                        onChange={(e) => item.setter?.(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 mt-1 text-sm outline-none focus:border-primary/50 transition-colors"
                      />
                    ) : (
                      <div className="truncate text-sm font-medium">{item.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 space-y-3">
              <button 
                disabled={updateProfile.isPending}
                onClick={() => isEditing ? updateProfile.mutate() : setIsEditing(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  <><Check className="h-4 w-4" /> သိမ်းဆည်းမည်</>
                ) : (
                  <><Edit2 className="h-4 w-4" /> အချက်အလက်ပြင်ဆင်ရန်</>
                )}
              </button>
              {isEditing ? (
                <button onClick={() => setIsEditing(false)} className="w-full glass-panel px-4 py-3 text-sm font-medium hover:bg-white/10 transition-all text-muted-foreground">
                  မလုပ်တော့ပါ
                </button>
              ) : (
                <button onClick={() => onOpenChange(false)} className="w-full glass-panel px-4 py-3 text-sm font-medium hover:bg-white/10 transition-all">
                  ပိတ်မည်
                </button>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}