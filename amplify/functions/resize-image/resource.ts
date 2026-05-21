import { defineFunction } from '@aws-amplify/backend';

export const resizeImage = defineFunction({
    name: 'resize-image',
    architecture: 'arm64',

    resourceGroupName: 'storage',

    timeoutSeconds: 30,
    memoryMB: 1024,
});
