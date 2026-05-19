import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Image } from 'react-native';
import { TextInput, Button, Card, Text, FAB, Appbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { signOut } from 'aws-amplify/auth';
import { BoardComponent } from '../../../ui-components';

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
        setItems(sorted);
    };

    useEffect(() => {
        const init = async () => {
            // -----------------------------
            // ① 初回ロード・リアルタイム監視
            // -----------------------------
            //const result = await client.models.Board.list({
            //    authMode: 'userPool',
            //});
            const result = client.models.Board.observeQuery({
                authMode: 'userPool',
            }).subscribe({
                next: ({ items }) => {
                    const sorted = [...items].sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                    );
                    setItems(items);
                },
                error: (error) => {
                    console.error(error);
                },
            });
            return () => result.unsubscribe();
            // -----------------------------
            // ② データが0件なら作成
            // -----------------------------
            if (items.length === 0) {
                console.log("初期データ作成");

                // Person を作成
                const person = await client.models.Person.create({
                    name: "テストユーザー",
                    email: "test@example.com",
                });
                const personData = person.data;

                if (!personData) {
                    throw new Error('Person create failed');
                }

                await client.models.Board.create({
                    name: "テストユーザー",
                    message: "最初の投稿",
                    personID: personData!.id,
                });

            }

            // ✅ 初回データ取得
            load();
        };

        init();

        // -----------------------------
        // リアルタイム監視（observeの代替）
        // -----------------------------
        //const sub = client.models.Board.observeQuery().subscribe({
        //  next: ({ items }) => {
        //    setItems(items);
        //  },
        //});

        //return () => sub.unsubscribe();

        //signOut(); // 開発中だけ
    }, []);

    useFocusEffect(
        useCallback(() => {
            console.log("useFocusEffect triggered");

            load();

            return () => { };
        }, [])
    );

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
            <Button mode="contained" onPress={() => setFind(input)}>
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
                            {item.image && (
                                <Image
                                    source={{ uri: item.image }}
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
