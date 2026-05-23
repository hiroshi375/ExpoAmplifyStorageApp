import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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

const styles = StyleSheet.create({

    name: {
        fontSize: 14,
        color: '#888',
    },

    message: {
        fontSize: 16,
        color: '#000',
        marginTop: 4,
    },

    middleRow: {
        flexDirection: 'row',
        marginTop: 8,
        alignItems: 'flex-start',
    },

    image: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 12,
    },

    description: {
        flex: 1,           // ← 重要（右側いっぱい使う）
        fontSize: 13,
        color: '#666',
    },

    date: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 8,
    },
});

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

    // -----------------------------
    // 削除
    // -----------------------------
    const deleteBoard = async (id: string) => {
        Alert.alert(
            "削除確認",
            "この投稿を削除しますか？",
            [
                {
                    text: "キャンセル",
                    style: "cancel",
                },
                {
                    text: "OK",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.models.Board.delete(
                                { id },
                                {
                                    authMode: 'userPool',
                                }
                            );

                            Alert.alert("成功", "削除しました");

                            // 一覧更新
                            await load();

                        } catch (e) {
                            console.error(e);
                            Alert.alert("エラー", "削除に失敗しました");
                        }
                    },
                },
            ]
        );
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
                    <Card style={{ marginBottom: 10 }}
                        onPress={() => deleteBoard(item.id)}
                    >
                        <Card.Content>
                            {/* 共通：name */}
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: '#888',
                                    lineHeight: 22,
                                    marginTop: 4,
                                }}
                            >{item.name}</Text>
                            {/* 共通：message:タイトル */}
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: '#000',
                                    lineHeight: 22,
                                    marginTop: 4,
                                }}
                            >{item.message}</Text>
                            {/* 中段：Image + description（横並び） */}
                            <View style={styles.middleRow}>
                                {item.imageUrl && (
                                    <Image
                                        source={{ uri: item.imageUrl }}
                                        style={styles.image}
                                    />
                                )}
                                {/* description: 画像がない場合もdescriptionは表示させる */}
                                <Text style={styles.description}>
                                    {item.description ?? ''}
                                </Text>
                            </View>
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
