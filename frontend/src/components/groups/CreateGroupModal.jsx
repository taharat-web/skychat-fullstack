import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { friendsApi, groupsApi } from '../../api';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';

export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDescription('');
    setSelected(new Set());
    setError('');
    setIsLoadingFriends(true);
    friendsApi
      .list()
      .then(({ friends }) => setFriends(friends))
      .catch(() => toast.error('Could not load your friends list'))
      .finally(() => setIsLoadingFriends(false));
  }, [isOpen]);

  function toggleFriend(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your group a name');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const { conversation } = await groupsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: [...selected],
      });
      toast.success(`"${name.trim()}" created`);
      onCreated(conversation.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create the group');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a group">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Weekend Trip" />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="What's this group about?"
        />

        <div>
          <p className="text-sm text-ink-secondary mb-1.5">Add friends</p>
          <div className="max-h-48 overflow-y-auto scrollbar-thin border border-app-border rounded-lg">
            {isLoadingFriends && <Spinner className="py-6" />}
            {!isLoadingFriends && friends.length === 0 && (
              <p className="text-center text-sm text-ink-secondary py-6 px-3">
                You don't have any friends yet - you can still create the group and add people later.
              </p>
            )}
            {!isLoadingFriends &&
              friends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-app-elevated cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(friend.id)}
                    onChange={() => toggleFriend(friend.id)}
                    className="accent-accent"
                  />
                  <Avatar src={friend.avatarUrl} name={friend.username} size="sm" />
                  <span className="text-sm text-ink-primary">{friend.username}</span>
                </label>
              ))}
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
