import type { User } from '@onlook/models';
import type { User as DbUser } from '../../schema';

export const toDbUser = (user: User): DbUser => {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stripeCustomerId: user.stripeCustomerId,
        githubInstallationId: user.githubInstallationId,
    };
};

export const fromDbUser = (user: DbUser): User => {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stripeCustomerId: user.stripeCustomerId,
        githubInstallationId: user.githubInstallationId,
    };
};