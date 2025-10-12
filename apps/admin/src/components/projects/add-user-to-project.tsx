'use client';

import { api } from '@/trpc/react';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@onlook/ui/command';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@onlook/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@onlook/ui/select';
import { Check, Plus, Search } from 'lucide-react';
import { useState } from 'react';

interface AddUserToProjectProps {
    projectId: string;
}

export function AddUserToProject({ projectId }: AddUserToProjectProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
    const [role, setRole] = useState<'owner' | 'admin'>('admin');

    const utils = api.useUtils();

    const { data: searchResults } = api.users.search.useQuery(
        { query: searchQuery, limit: 10 },
        { enabled: searchQuery.length > 0 }
    );

    const addUserMutation = api.projects.addUser.useMutation({
        onSuccess: () => {
            utils.projects.getById.invalidate(projectId);
            setSelectedUser(null);
            setSearchQuery('');
            setRole('admin');
            setOpen(false);
        },
        onError: (error) => {
            alert(error.message);
        },
    });

    const handleAddUser = () => {
        if (!selectedUser) return;

        addUserMutation.mutate({
            projectId,
            userId: selectedUser.id,
            role,
        });
    };

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Add User to Project</h3>
            <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="user-search" className="text-xs">
                        Search User
                    </Label>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="user-search"
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                            >
                                {selectedUser ? (
                                    <div className="flex items-center gap-2">
                                        <span className="truncate">{selectedUser.name}</span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            ({selectedUser.email})
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">Search by name, email, or ID...</span>
                                )}
                                <Search className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                        {searchQuery.length === 0
                                            ? 'Start typing to search users...'
                                            : 'No users found.'}
                                    </CommandEmpty>
                                    {searchResults && searchResults.length > 0 && (
                                        <CommandGroup>
                                            {searchResults.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.id}
                                                    onSelect={() => {
                                                        setSelectedUser({
                                                            id: user.id,
                                                            name: user.name || '',
                                                            email: user.email || '',
                                                        });
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Avatar className="size-6">
                                                            <AvatarImage src={user.avatarUrl || undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {user.name?.[0]?.toUpperCase() || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm">{user.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {selectedUser?.id === user.id && (
                                                        <Check className="size-4" />
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="w-32 space-y-2">
                    <Label htmlFor="role-select" className="text-xs">
                        Role
                    </Label>
                    <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                        <SelectTrigger id="role-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={handleAddUser}
                        disabled={!selectedUser || addUserMutation.isPending}
                        size="sm"
                        className="h-10"
                    >
                        <Plus className="size-4 mr-1" />
                        Add
                    </Button>
                </div>
            </div>
        </div>
    );
}
