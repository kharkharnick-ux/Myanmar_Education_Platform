import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { X, User, Mail, Phone, ShieldCheck, Calendar, Edit2, Loader2, Check, Camera, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
  user: {
    full_name: string;
    email: string;
    phone?: string | null;
    role: string;
    avatar_url?: string | null;
    created_at?: string | null;
  };
}

type ProfileCache = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

const getInitials = (name: string, email: string) => {
  const source = name.trim() || email.split("@")[0] || "SA";
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
};

const getAvatarExtension = (file: File) => {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "";
};

const validateAvatarFile = (file: File) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Profile image ကို PNG, JPG, WEBP image file သာ တင်နိုင်ပါသည်။");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profile image file size သည် 5 MB ထက် မကျော်ရပါ။");
  }
};

export function ProfileDrawer({ open, onOpenChange, onProfileUpdated, user }: ProfileDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setIsEditing(false);
      setErrorMessage("");
    }
  }, [open, user]);

  const updateProfileCache = (profile: ProfileCache) => {
    queryClient.setQueryData<ProfileCache | null>(["user-profile"], (current) => ({
      ...(current || {}),
      ...profile,
    }));
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    onProfileUpdated?.();
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) throw new Error("အကောင့်ဝင်ရန် လိုအပ်ပါသည်။");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as ProfileCache;
    },
    onSuccess: (data) => {
      updateProfileCache(data);
      setIsEditing(false);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Profile update လုပ်၍မရပါ။");
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateAvatarFile(file);
      setUploading(true);
      setErrorMessage("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) throw new Error("အကောင့်ဝင်ရန် လိုအပ်ပါသည်။");

      const extension = getAvatarExtension(file);
      const storagePath = `${authUser.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(storagePath);

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      updateProfileCache(updatedProfile as ProfileCache);
    } catch (error) {
      console.error("Avatar upload failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Profile image upload လုပ်၍မရပါ။");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Profile image ကို ဖျက်ရန် သေချာပါသလား?")) return;

    try {
      setUploading(true);
      setErrorMessage("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) throw new Error("အကောင့်ဝင်ရန် လိုအပ်ပါသည်။");

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id)
        .select("*")
        .single();

      if (error) throw error;
      updateProfileCache(updatedProfile as ProfileCache);
    } catch (error) {
      console.error("Avatar delete failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Profile image ဖျက်၍မရပါ။");
    } finally {
      setUploading(false);
    }
  };

  const profileItems = [
    {
      id: "name",
      icon: User,
      label: "အမည်အပြည့်အစုံ",
      value: user.full_name,
      current: fullName,
      setter: setFullName,
      editable: true,
    },
    { id: "email", icon: Mail, label: "Email လိပ်စာ", value: user.email, editable: false },
    {
      id: "phone",
      icon: Phone,
      label: "ဖုန်းနံပါတ်",
      value: user.phone || "မသတ်မှတ်ရသေးပါ",
      current: phone,
      setter: setPhone,
      editable: true,
    },
    { id: "role", icon: ShieldCheck, label: "တာဝန်", value: user.role, editable: false },
    {
      id: "date",
      icon: Calendar,
      label: "စတင်အသုံးပြုသည့်ရက်",
      value: user.created_at
        ? new Date(user.created_at).toLocaleDateString("my-MM", { year: "numeric", month: "long" })
        : "မသိရသေးပါ",
      editable: false,
    },
  ];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-background/45 backdrop-blur-md" />
        <Drawer.Content className="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none focus:ring-0">
          <div className="aqua-card flex flex-col rounded-3xl p-6">
            <div className="mb-8 flex items-center justify-between">
              <Drawer.Title className="aqua-section-title text-xl">ကိုယ်ရေးအချက်အလက်</Drawer.Title>
              <button onClick={() => onOpenChange(false)} className="glass-panel rounded-xl p-2 transition-all hover:glow-ring">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-8 flex flex-col items-center">
              <div className="group relative mb-6">
                <div className="relative rounded-[2.5rem] p-1.5 glass-panel shadow-2xl">
                  <div className="theme-icon-tile-strong relative h-28 w-28 overflow-hidden rounded-[2.2rem] text-3xl font-bold shadow-inner">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      getInitials(user.full_name, user.email)
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
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />

                {user.avatar_url && (
                  <div className="absolute -bottom-2 -left-2 scale-90 transition-transform duration-300 group-hover:scale-100">
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      disabled={uploading}
                      className="glass-panel rounded-2xl p-2.5 text-destructive shadow-xl transition-all hover:bg-destructive hover:text-white disabled:opacity-50"
                      title="ပုံဖျက်ရန်"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="absolute -bottom-2 -right-2 scale-90 transition-transform duration-300 group-hover:scale-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="glass-panel rounded-2xl p-2.5 text-primary shadow-xl transition-all hover:glow-ring disabled:opacity-50"
                    title="ပုံတင်ရန်"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>

            <div className="flex-1 space-y-4">
              {profileItems.map((item) => (
                <div key={item.id} className="glass-panel flex items-center gap-4 p-4 transition-all hover:bg-accent/35 hover:glow-ring">
                  <div className="gloss-highlight grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</div>
                    {isEditing && item.editable ? (
                      <input
                        type="text"
                        value={item.current}
                        onChange={(event) => item.setter?.(event.target.value)}
                        className="aqua-input mt-1 w-full rounded-lg px-2 py-1 text-sm"
                      />
                    ) : (
                      <div className="truncate text-sm font-medium">{item.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-3 pt-6">
              {errorMessage && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
              <button
                disabled={updateProfile.isPending || uploading || (isEditing && !fullName.trim())}
                onClick={() => (isEditing ? updateProfile.mutate() : setIsEditing(true))}
                className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:brightness-105 disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  <>
                    <Check className="h-4 w-4" /> သိမ်းဆည်းမည်
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" /> အချက်အလက်ပြင်ဆင်ရန်
                  </>
                )}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setFullName(user.full_name);
                    setPhone(user.phone || "");
                    setIsEditing(false);
                  }}
                  className="glass-panel w-full px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/35"
                >
                  မလုပ်တော့ပါ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="glass-panel w-full px-4 py-3 text-sm font-medium transition-all hover:bg-accent/35"
                >
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
