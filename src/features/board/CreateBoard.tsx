
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
import { getCurrentUser } from 'aws-amplify/auth';
import * as ImageManipulator from 'expo-image-manipulator';

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
    const [description, setDescription] = useState('');

    const [imagePath, setImagePath] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);

    // 👇 追加：Person関連
    const [people, setPeople] = useState<any[]>([]);
    //const [selectedPersonId, setSelectedPersonId] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    // List.Accordionの展開状態管理
    const [expanded, setExpanded] = useState(false);
    // 選択されたPersonの情報を保持（確認用）
    //const [selectedPerson, setSelectedPerson] = useState<any>(null);
    // 👇 表示用（ここ重要）
    const selectedPerson = people.find(p => p.id === selectedPersonId) ?? null;

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
            quality: 0.3, // 画質を下げてサイズを小さくする
        });

        if (!result.canceled) {
            // -----------------------------
            // 画像リサイズ
            // -----------------------------
            const manipulatedImage =
                await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [
                        {
                            resize: {
                                width: 1024,
                            },
                        },
                    ],
                    {
                        compress: 0.3,
                        format: ImageManipulator.SaveFormat.JPEG,
                    }
                );

            console.log(
                "RESIZED IMAGE =",
                manipulatedImage
            );
            setImageUri(manipulatedImage.uri);
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

    // AI生成関数
    const generateByAI = async () => {
        try {
            if (!imageUri) {
                Alert.alert("エラー", "画像を選択してください");
                return;
            }

            setLoadingAI(true);

            // -----------------------------
            // ① S3アップロード
            // -----------------------------
            const uploadedPath = await uploadImage(imageUri);

            setImagePath(uploadedPath);

            // -----------------------------
            // ② Bedrock実行
            // -----------------------------
            const API_URL =
                "https://u4v1f505h9.execute-api.ap-northeast-1.amazonaws.com/stg/generate-board-text";

            const aiResult = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageKey: uploadedPath,
                }),
            });

            const json = await aiResult.json();
            if (!json.ok) {
                Alert.alert("エラー", json.error);
                return;
            }
            console.log("AI RESULT:", json);

            // Bedrock結果を画面へ反映
            setFmsg(json.message || "");
            setDescription(json.description || "");

            Alert.alert("成功", "AI生成が完了しました");

        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "AI生成に失敗しました");
        } finally {
            setLoadingAI(false);
        }
    };

    useEffect(() => {
        const fetchPeople = async () => {
            try {

                // -----------------------------
                // Person一覧取得
                // -----------------------------
                const result = await client.models.Person.list({
                    authMode: 'userPool',
                });

                setPeople(result.data);

                // -----------------------------
                // ログインユーザー取得
                // -----------------------------
                const currentUser = await getCurrentUser();

                console.log("currentUser =", currentUser);

                // username or userId に一致するPersonを探す
                const loginPerson = result.data.find(
                    (p: any) =>
                        p.email === currentUser.signInDetails?.loginId
                );

                // -----------------------------
                // デフォルト選択
                // -----------------------------
                if (loginPerson) {
                    setSelectedPersonId(loginPerson.id);
                }

            } catch (e) {
                console.error("fetchPeople error =", e);
            }
        };

        fetchPeople();

    }, []);

    // -----------------------------
    // 作成処理
    // -----------------------------
    const onCreate = async () => {
        try {

            if (!fmsg || fmsg.trim() === "") {
                Alert.alert("エラー", "タイトルは必須です");
                return;
            }

            if (!selectedPersonId) {
                Alert.alert("エラー", "ユーザーを選択してください");
                return;
            }

            if (!imagePath) {
                Alert.alert("エラー", "先に画像アップロードをしてください");
                return;
            }

            // Person取得
            const user = people.find(
                (p) => p.id === selectedPersonId
            );

            if (!user) {
                Alert.alert("エラー", "ユーザーが見つかりません");
                return;
            }

            // -----------------------------
            // Board作成
            // -----------------------------
            const result = await client.models.Board.create(
                {
                    message: fmsg,
                    description: description,
                    name: user.name,
                    image: imagePath,
                    personID: user.id,
                },
                {
                    authMode: 'userPool',
                }
            );

            console.log("Board created =", result);

            Alert.alert("成功", "投稿しました");

            // リセット
            setFmsg("");
            setDescription("");
            setImageUri(null);
            setImagePath(null);

            navigation.goBack();

        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "投稿に失敗しました");
        }
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Card>
                <Card.Content>
                    <Text variant="titleLarge">Create Board</Text>
                    <TextInput
                        label="Title"
                        value={fmsg}
                        onChangeText={setFmsg}
                        mode="outlined"
                        style={{ marginTop: 10 }}
                    />
                    <Text style={{ color: 'red', fontSize: 10 }}>
                        {!fmsg?.trim() && "タイトルを入力してください"}
                    </Text>
                    <TextInput
                        label="詳細説明を入力"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={5}
                        style={{
                            marginTop: 10,
                            fontSize: 16,
                            minHeight: 120
                        }}
                    />
                    {/* 👇 ユーザー選択 */}
                    <List.Accordion
                        title={
                            selectedPerson?.name || "ユーザー選択"
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
                    <Button
                        mode="contained"
                        onPress={generateByAI}
                        style={{ marginTop: 10 }}
                        loading={loadingAI}
                        disabled={!imageUri || loadingAI}
                    >
                        画像アップロード
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
                        disabled={
                            !fmsg ||
                            fmsg.trim() === "" ||
                            !selectedPersonId ||
                            !imagePath // 画像アップロードが完了していない場合は投稿できないようにする
                        }
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
