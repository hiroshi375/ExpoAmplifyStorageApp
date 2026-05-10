//src/UploadScreen.tsx

import { useState } from 'react';
import { View, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadData } from 'aws-amplify/storage';

export default function UploadScreen() {
    const [uri, setUri] = useState<string | null>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled) {
            setUri(result.assets[0].uri);
        }
    };

    const upload = async () => {
        console.log("1. upload start");

        if (!uri) {
            console.log("uriなし");
            return;
        }

        console.log("2. uri:", uri);

        try {
            const res = await fetch(uri);
            const blob = await res.blob();

            console.log("3. blob OK");

            const uploadTask = await uploadData({
                path: `images/${Date.now()}.jpg`,
                data: blob,
                options: {
                    contentType: 'image/jpeg',
                },
            });
            await uploadTask.result;
            console.log("upload result:", uploadTask.result);

            console.log("4. upload success");
        } catch (e) {
            console.log("UPLOAD ERROR:", e);
        }
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            <Button title="画像選択" onPress={pickImage} />
            <Button title="アップロード" onPress={upload} />

            {uri && (
                <Image
                    source={{ uri }}
                    style={{ width: 200, height: 200 }}
                />
            )}
        </View>
    );
}
