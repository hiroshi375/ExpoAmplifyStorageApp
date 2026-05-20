import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Image } from 'react-native';
import { TextInput, Button, Card, Text, FAB, Appbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { signOut } from 'aws-amplify/auth';
import { BoardComponent } from '../../../ui-components';
import { getUrl } from 'aws-amplify/storage';

const client = generateClient<Schema>();

const formatJST = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

type RootStackParamList = {
    ListBoard: undefined;
    CreateBoard: undefined;
};

function ListBoard() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ListBoard'>>();
    const [items, setItems] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [find, setFind] = useState("");

    // -----------------------------
    // 検索入力
    // -----------------------------
    const doChange = (e: any) => {
        setInput(e.target.value);
    };

    const doFilter = () => {
        setFind(input);
    };

    // -----------------------------
    // データ取得
    // -----------------------------
    const load = async () => {
        let result;

        if (find) {
            const filter = {
                or: [
                    { name: { contains: find } },
                    { message: { contains: find } },
                ],
            } as any;

            result = await client.models.Board.list({ filter, authMode: 'userPool' });
            //console.log("取得結果:", result);
            //console.log("Boardデータ本体:", result.data);
        } else {
            result = await client.models.Board.list({ authMode: 'userPool' });
            //console.log("取得結果:", result);
            //console.log("Boardデータ本体:", result.data);
        }
        // 👇 追加：新しい順にソート
        const sorted = [...result.data].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

        // 👇 S3 URL取得
        const boardsWithUrls = await Promise.all(
            sorted.map(async (item) => {

                let imageUrl = null;

                if (item.image) {
                    try {
                        // 既にURLならそのまま使用
                        if (item.image.startsWith('http')) {

                            console.log("EXISTING URL =", item.image);

                            imageUrl = item.image;

                        } else {

                            // S3 path の場合だけ getUrl
                            console.log("S3 PATH =", item.image);

                            const urlResult = await getUrl({
                                path: item.image,
                            });

                            imageUrl = urlResult.url.toString();

                            //console.log("SIGNED URL =", imageUrl);
                        }

                    } catch (e) {
                        console.error("getUrl error =", e);
                    }
                }

                return {
                    ...item,
                    imageUrl,
                };
            })
        );

        setItems(boardsWithUrls);
    };

    useEffect(() => {

        let subscription: any;

        const startObserve = async () => {

            let filter = undefined;

            // フィルター条件
            if (find.trim()) {
                filter = {
                    or: [
                        { name: { contains: find } },
                        { message: { contains: find } },
                    ],
                } as any;
            }

            subscription = client.models.Board.observeQuery({
                filter,
                authMode: 'userPool',
            }).subscribe({

                next: async ({ items }) => {

                    const sorted = [...items].sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                    );

                    const boardsWithUrls = await Promise.all(
                        sorted.map(async (item) => {

                            let imageUrl = null;

                            if (item.image) {
                                try {

                                    // 既にURLならそのまま
                                    if (item.image.startsWith('http')) {

                                        imageUrl = item.image;

                                    } else {

                                        const urlResult = await getUrl({
                                            path: item.image,
                                        });

                                        imageUrl = urlResult.url.toString();
                                    }

                                } catch (e) {
                                    console.error("getUrl error =", e);
                                }
                            }

                            return {
                                ...item,
                                imageUrl,
                            };
                        })
                    );

                    setItems(boardsWithUrls);
                },

                error: (error) => {
                    console.error(error);
                },
            });
        };

        startObserve();

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };

    }, [find]);

    return (
        <View style={{ flex: 1, padding: 8 }}>
            {/* 検索 */}
            <TextInput
                value={input}
                onChangeText={setInput}
                style={{
                    fontSize: 16,
                    borderWidth: 1,
                    margin: 4,
                    padding: 1,
                }}
            />
            <Button mode="contained" onPress={async () => setFind(input)}>
                フィルター
            </Button>

            {/* リスト */}
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    paddingVertical: 10,
                    paddingBottom: 120, // FABのスペース確保
                }}
                renderItem={({ item }) => (

                    <Card style={{ marginBottom: 10 }}>
                        <Card.Content>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: '#888',
                                    lineHeight: 22,
                                    marginTop: 4,
                                }}
                            >{item.name}</Text>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: '#000',
                                    lineHeight: 22,
                                    marginTop: 4,
                                }}
                            >{item.message}</Text>
                            {item.imageUrl && (
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={{ width: 100, height: 100 }}
                                />
                            )}
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: '#888',
                                    lineHeight: 22,
                                    marginTop: 4,
                                }}
                            >{formatJST(item.createdAt)}</Text>
                        </Card.Content>
                    </Card>
                )}

            />
            {/* サインアウトボタン */}
            <Button
                mode="outlined"
                onPress={async () => {
                    try {
                        await signOut();
                    } catch (e) {
                        console.log('sign out error:', e);
                    }
                }}
                style={{
                    marginTop: 8,
                    marginBottom: 40,
                }}
            >
                サインアウト
            </Button>
            {/* 画面遷移（List → Create）ボタン */}
            {/* FAB（右下ボタン） */}
            <FAB
                icon="plus"
                style={{
                    position: 'absolute',
                    right: 16,
                    bottom: 48,
                    zIndex: 100,
                }}
                onPress={() => navigation.navigate('CreateBoard')}
            />

        </View>
    );
}

export default ListBoard;
