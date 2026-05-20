
import { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { TextInput, Button, Card, Text, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { uploadData } from 'aws-amplify/storage';

const client = generateClient<Schema>();

type RootStackParamList = {
    ListBoard: undefined;
    CreateBoard: undefined;
};

function CreateBoard() {
    const [fmsg, setFmsg] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreateBoard'>>();
    //const [fmsg, setFmsg] = useState("");
    //const [femail, setFemail] = useState("");

    // 👇 追加：Person関連
    const [people, setPeople] = useState<any[]>([]);
    //const [selectedPersonId, setSelectedPersonId] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    // List.Accordionの展開状態管理
    const [expanded, setExpanded] = useState(false);
    // 選択されたPersonの情報を保持（確認用）
    //const [selectedPerson, setSelectedPerson] = useState<any>(null);
    // 👇 表示用（ここ重要）
    const selectedPerson = people.find(p => p.id === selectedPersonId);

    // 画像選択関数
    const pickImage = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert("権限エラー", "画像アクセス権限が必要です");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    // S3画像アップロード関数
    const uploadImage = async (uri: string) => {
        console.log("NEW uploadImage called");
        try {
            const response = await fetch(uri);
            const blob = await response.blob();

            const path = `images/${Date.now()}.jpg`;

            const uploadTask = await uploadData({
                path,
                data: blob,
                options: {
                    contentType: 'image/jpeg',
                },
            }).result;

            console.log("S3 upload success:", path);

            //await uploadTask.result;

            // S3 URL取得
            //const urlResult = await getUrl({
            //    path,
            //});

            // ❗ URLではなく path を返す
            return path;

        } catch (e) {
            console.error("UPLOAD ERROR:", e);
            throw e;
        }
    };

    // -----------------------------
    // Person一覧取得
    // -----------------------------
    useEffect(() => {
        const fetchPeople = async () => {
            const result = await client.models.Person.list({
                authMode: 'userPool',
            });
            setPeople(result.data);
        };

        fetchPeople();
        console.log("selectedPerson updated:", JSON.stringify(selectedPerson, null, 2)); // 👈 追加
        //    }, [selectedPersonId]);
    }, []); // 初回レンダリング時のみ取得


    // -----------------------------
    // 作成処理
    // -----------------------------
    const onCreate = async () => {
        try {
            if (!fmsg || fmsg.trim() === "") {
                Alert.alert("エラー", "メッセージは必須です");
                return;
            }
            if (!selectedPersonId) {
                Alert.alert("エラー", "ユーザーを選択してください");
                return;
            }
            // Person取得（確認用）
            const user = people.find(p => p.id === selectedPersonId);

            if (!user) {
                Alert.alert("エラー", "ユーザーが見つかりません");
                return;
            }

            // 👇 画像アップロード
            // let imageUrl = null;
            let imagePath = null;

            if (imageUri) {
                imagePath = await uploadImage(imageUri);
            }

            // -----------------------------
            // ② Board作成
            // -----------------------------
            try {
                const result = await client.models.Board.create(
                    {
                        message: fmsg,
                        name: user.name,
                        image: imagePath, // S3のパスを保存
                        personID: user.id,
                    },
                    {
                        authMode: 'userPool', // 👈 これを追加
                    }
                );
                console.log("Board created successfully", result);
                console.log("FULL RESULT:", JSON.stringify(result, null, 2));
                Alert.alert("成功", "メッセージを投稿しました。");

            } catch (e) {
                console.error("Error creating Board:", e);
                Alert.alert("エラー", "Boardの作成に失敗しました。");
                return;
            }

            // 入力リセット
            setFmsg("");
            setImageUri(null);
            setSelectedPersonId(null);

            navigation.goBack();

        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "投稿に失敗しました。");
        }
    };


    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Card>
                <Card.Content>
                    <Text variant="titleLarge">Create Board</Text>
                    <TextInput
                        label="Message"
                        value={fmsg}
                        onChangeText={setFmsg}
                        mode="outlined"
                        style={{ marginTop: 10 }}
                    />
                    <Text style={{ color: 'red', fontSize: 10 }}>
                        {!fmsg?.trim() && "メッセージを入力してください"}
                    </Text>
                    {/* 👇 ユーザー選択 */}
                    <List.Accordion
                        title={selectedPersonId
                            ? people.find(p => p.id === selectedPersonId)?.name
                            : "ユーザー選択"
                        }
                        expanded={expanded}
                        onPress={() => setExpanded(!expanded)}
                    >
                        {/*<List.Subheader>ユーザー選択</List.Subheader> */}

                        {people.map((p) => (
                            <List.Item
                                key={p.id}
                                title={p.name}
                                description={p.email}
                                onPress={() => {
                                    console.log("選択:", p.name); // 👈 追加
                                    //setSelectedPerson(p);   // 👈 これ追加
                                    //console.log("selectedPerson:", selectedPerson);
                                    setSelectedPersonId(p.id);
                                    setExpanded(false); // 選択後にアコーディオンを閉じる
                                }}
                                left={(props) => (
                                    <List.Icon
                                        {...props}
                                        icon={selectedPersonId === p.id ? "check-circle" : "account"}
                                    />
                                )}
                                style={{
                                    backgroundColor:
                                        selectedPersonId === p.id ? "#e3f2fd" : "transparent",
                                }}
                            />
                        ))}
                        {/*</List.Section>*/}
                    </List.Accordion>
                    <Text style={{ color: 'red', fontSize: 10 }}>
                        {!selectedPersonId && "ユーザーを選択してください"}
                    </Text>
                    {/*<TextInput
                        label="Image URL"
                        value={fimg}
                        onChangeText={setFimg}
                        mode="outlined"
                        style={{ marginTop: 10 }}
                    />*/}
                    <Button
                        mode="outlined"
                        onPress={pickImage}
                        style={{ marginTop: 10 }}
                    >
                        画像選択
                    </Button>
                    {imageUri && (
                        <Image
                            source={{ uri: imageUri }}
                            style={{
                                width: 200,
                                height: 200,
                                marginTop: 10,
                                alignSelf: 'center',
                            }}
                        />
                    )}
                    <Button
                        mode="contained"
                        onPress={onCreate}
                        style={{ marginTop: 20 }}
                        disabled={!fmsg || fmsg.trim() === "" || !selectedPersonId}
                    >
                        投稿
                    </Button>

                    {/* 画面遷移（Create → List）ボタン */}
                    <Button
                        mode="contained"
                        onPress={() => navigation.goBack()}
                        style={{ marginTop: 10 }}>
                        戻る
                    </Button>
                </Card.Content>
            </Card>

        </View>
    );
}

export default CreateBoard;
