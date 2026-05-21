import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { resizeImage } from './functions/resize-image/resource';

import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    storage,
    data,
    resizeImage,
});

backend.storage.resources.bucket.grantReadWrite(
    backend.resizeImage.resources.lambda
);

backend.storage.resources.bucket.addEventNotification(
    EventType.OBJECT_CREATED,
    new LambdaDestination(
        backend.resizeImage.resources.lambda
    ),
    {
        prefix: 'images/',
    }
);
