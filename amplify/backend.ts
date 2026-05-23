import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { resizeImage } from './functions/resize-image/resource';
import { generateBoardText } from "./functions/generateBoardText/resource";

import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Duration } from "aws-cdk-lib";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    storage,
    data,
    resizeImage,
    generateBoardText,
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

backend.storage.resources.bucket.grantRead(
    backend.generateBoardText.resources.lambda
);

backend.generateBoardText.resources.lambda.addToRolePolicy(
    new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
            "*"
        ],
    })
);
