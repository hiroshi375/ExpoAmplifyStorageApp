import { useEffect, useState, useCallback } from "react";
import {
    View,
    FlatList,
    Image,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from "react-native";
import { TextInput, Button, Card, Text, FAB, Appbar } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../amplify/data/resource";
import { signOut, getCurrentUser } from "aws-amplify/auth";
import { BoardComponent } from "../../../ui-components";
import { getUrl } from "aws-amplify/storage";

const client = generateClient<Schema>();

const formatJST = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

type RootStackParamList = {
    ListBoard: undefined;
    CreateBoard: undefined;
};

const styles = StyleSheet.create({
    name: {
        fontSize: 14,
        color: "#888",
    },

    message: {
        fontSize: 16,
        color: "#000",
        marginTop: 4,
    },

    middleRow: {
        flexDirection: "row",
        marginTop: 8,
        alignItems: "flex-start",
    },

    image: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 12,
    },

    description: {
        flex: 1, // ← 重要（右側いっぱい使う）
        fontSize: 13,
        color: "#666",
    },

    date: {
        fontSize: 12,
        color: "#aaa",
        marginTop: 8,
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },

    topLeft: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },

    visibility: {
        fontSize: 12,
        marginLeft: 8,
    },

    createdAt: {
        fontSize: 12,
        color: "#aaa",
        marginLeft: 8,
    },
});

function ListBoard() {
    const navigation =
        useNavigation<
            NativeStackNavigationProp<RootStackParamList, "ListBoard">
        >();
    const [items, setItems] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [find, setFind] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // 追加：削除可能かどうかの判定関数
    const canDeleteBoard = (item: any) => {
        return currentUserId !== null && item.ownerUserId === currentUserId;
    };

    // -----------------------------
    // データ取得
    // -----------------------------
    const load = async () => {
        try {
            const currentUser = await getCurrentUser();
            setCurrentUserId(currentUser.userId);

            let filter = undefined;

            if (find.trim()) {
                filter = {
                    or: [
                        { name: { contains: find } },
                        { message: { contains: find } },
                    ],
                } as any;
            }

            const publicResult = await client.models.PublicBoard.list({
                filter,
                authMode: "userPool",
            });

            const privateResult = await client.models.PrivateBoard.list({
                filter,
                authMode: "userPool",
            });

            const publicBoards = publicResult.data.map((item) => ({
                ...item,
                visibility: "public",
                boardType: "public",
            }));

            const privateBoards = privateResult.data.map((item) => ({
                ...item,
                visibility: "private",
                boardType: "private",
            }));

            const merged = [...publicBoards, ...privateBoards];

            const sorted = merged.sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );

            const boardsWithUrls = await Promise.all(
                sorted.map(async (item) => {
                    let imageUrl = null;

                    if (item.image) {
                        try {
                            if (item.image.startsWith("http")) {
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
                }),
            );

            setItems(boardsWithUrls);
        } catch (e) {
            console.error("load error =", e);
            Alert.alert("エラー", "投稿一覧の取得に失敗しました");
        }
    };
    // -----------------------------
    // 削除
    // -----------------------------
    const deleteBoard = async (item: any) => {
        Alert.alert("削除確認", "この投稿を削除しますか？", [
            {
                text: "キャンセル",
                style: "cancel",
            },
            {
                text: "OK",
                style: "destructive",
                onPress: async () => {
                    try {
                        if (item.boardType === "public") {
                            await client.models.PublicBoard.delete(
                                { id: item.id },
                                {
                                    authMode: "userPool",
                                },
                            );
                        } else if (item.boardType === "private") {
                            await client.models.PrivateBoard.delete(
                                { id: item.id },
                                {
                                    authMode: "userPool",
                                },
                            );
                        } else {
                            Alert.alert(
                                "エラー",
                                "投稿種別が不明のため削除できません",
                            );
                            return;
                        }

                        Alert.alert("成功", "削除しました");

                        await load();
                    } catch (e) {
                        console.error(e);
                        Alert.alert("エラー", "削除に失敗しました");
                    }
                },
            },
        ]);
    };

    // 画面がフォーカスされるたびにload()を呼び出す
    useEffect(() => {
        load();
    }, [find]);

    // 画面がフォーカスされるたびにload()を呼び出す（useEffectと併用して二重呼び出しになるのを防ぐため、findを依存配列に入れる）
    useFocusEffect(
        useCallback(() => {
            load();
        }, [find]),
    );

    return (
        <View style={{ flex: 1, padding: 8 }}>
            {/* 検索 */}
            <TextInput
                value={input}
                onChangeText={setInput}
                mode="outlined"
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
                    <Card
                        style={{ marginBottom: 10 }}
                        onPress={() => {
                            if (canDeleteBoard(item)) {
                                deleteBoard(item);
                            } else {
                                Alert.alert(
                                    "削除できません",
                                    "自分が作成した投稿のみ削除できます",
                                );
                            }
                        }}
                    >
                        <Card.Content>
                            {/* 共通：name, visibility, createdAt */}
                            <View style={styles.topRow}>
                                <View style={styles.topLeft}>
                                    <Text style={styles.name} numberOfLines={1}>
                                        {item.name}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.visibility,
                                            {
                                                color:
                                                    item.visibility === "public"
                                                        ? "#2e7d32"
                                                        : "#666",
                                            },
                                        ]}
                                    >
                                        {item.visibility === "public"
                                            ? "公開"
                                            : item.visibility === "private"
                                              ? "非公開"
                                              : "未設定"}
                                    </Text>
                                </View>

                                <Text style={styles.createdAt}>
                                    {formatJST(item.createdAt)}
                                </Text>
                            </View>

                            {/* 共通：message:タイトル */}
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: "#000",
                                    lineHeight: 22,
                                    marginTop: 4,
                                    fontWeight: "bold",
                                }}
                            >
                                {item.message}
                            </Text>
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
                                    {item.description ?? ""}
                                </Text>
                            </View>
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
                        console.log("sign out error:", e);
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
                    position: "absolute",
                    right: 16,
                    bottom: 48,
                    zIndex: 100,
                }}
                onPress={() => navigation.navigate("CreateBoard")}
            />
        </View>
    );
}

export default ListBoard;
