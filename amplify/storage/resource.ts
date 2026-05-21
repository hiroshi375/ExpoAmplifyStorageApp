import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'ExpoStorage',
    access: (allow) => ({
        'images/*': [
            allow.authenticated.to(['read', 'write']),
        ],
        'resized/*': [
            allow.authenticated.to(['read']),
        ],
    }),
});
