import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import useAuthStore from '../store/authStore';
import { usersApi } from '../api';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const hasChanges = username !== user?.username || bio !== (user?.bio || '');

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { user: updated } = await usersApi.uploadAvatar(file);
      setUser(updated);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not upload photo');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const { user: updated } = await usersApi.updateProfile({ username, bio });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="font-display font-semibold text-2xl text-ink-primary mb-8">Your profile</h1>

        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar src={user?.avatarUrl} name={user?.username || '?'} size="xl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent hover:bg-accent-deep flex items-center justify-center text-white transition-colors"
              aria-label="Change profile photo"
            >
              <Camera size={15} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
          <Input label="Email" value={user?.email || ''} disabled className="opacity-60" />
          <div>
            <label className="block text-sm text-ink-secondary mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full bg-app-elevated border border-app-border focus:border-accent rounded-lg px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none resize-none"
              placeholder="Tell people a little about yourself"
            />
            <p className="text-xs text-ink-muted text-right mt-1">{bio.length}/280</p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <Button type="submit" disabled={!hasChanges} isLoading={isSaving} className="self-start">
            Save changes
          </Button>
        </form>
      </div>
    </div>
  );
}
