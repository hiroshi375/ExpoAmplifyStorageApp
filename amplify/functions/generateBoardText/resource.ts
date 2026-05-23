import { defineFunction } from "@aws-amplify/backend";

export const generateBoardText = defineFunction({
    name: "generateBoardText",
    timeoutSeconds: 30,
    memoryMB: 1024,
});
