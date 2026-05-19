import { useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const client = generateClient<Schema>();

type Props = {
    onComplete: () => void;
};

function CreateProfileScreen({ onComplete }: Props) {
    //throw new Error("Function not implemented.");
    const [name, setName] = useState("");

    const handleSave = async () => {
        const user = await getCurrentUser();
        const userId = user.userId;
        const email = user.signInDetails?.loginId;
        //throw new Error("Function not implemented.");

        if (!email || !name || !user.userId) return;

        console.log("BEFORE CREATE:", {
            name,
            email,
            userId: user.userId,
        });

        const result = await client.models.Person.create(
            {
                name: name,
                email: email,
                userId: userId,
            },
            {
                authMode: 'userPool', // 👈 これを追加
            }
        );
        console.log("FULL RESULT:", JSON.stringify(result, null, 2));
        // 👇 少し待つ（暫定）
        //await new Promise(res => setTimeout(res, 500));
        // 画面リロード or state更新
        //const check = await client.models.Person.list({
        //  filter: { userId: { eq: userId } },
        //});
        //if (check.data.length > 0) {
        //    onComplete();
        //}
        // 👇 無条件で戻す
        onComplete();
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
        }}>
            <Text style={{ marginBottom: 16 }}>
                ユーザー名を入力してください
            </Text>

            <TextInput
                value={name}
                onChangeText={setName}
                style={{
                    width: '80%',
                    marginBottom: 16
                }}
            />

            <Button
                onPress={handleSave}
                style={{
                    width: '80%'
                }}
            >
                登録
            </Button>
        </View>
    );
}

export default CreateProfileScreen;
