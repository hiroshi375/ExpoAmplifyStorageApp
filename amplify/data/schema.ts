// amplify/data/schema.ts
import { a, type ClientSchema } from "@aws-amplify/backend";

export const schema = a.schema({
    Todo: a
        .model({
            content: a.string(),
            isDone: a.boolean(),
        })
        .authorization((allow) => [
            allow.authenticated(), // 認証ユーザーは全員アクセス可能
        ]),
    Person: a
        .model({
            name: a.string().required(),
            email: a.email().required(),
            userId: a.string(),
            age: a.integer(),
            tel: a.phone(),
            boards: a.hasMany("Board", "personID"),
            publicBoards: a.hasMany("PublicBoard", "personID"),
            privateBoards: a.hasMany("PrivateBoard", "personID"),
        })
        .authorization((allow) => [
            allow.authenticated(), // 認証ユーザーは全員アクセス可能
        ]),

    Board: a
        .model({
            message: a.string().required(),
            description: a.string(), // ← 追加（既存データは影響なし）
            name: a.string(),
            image: a.string(),
            // 追加：公開範囲
            // "public" なら共有、"private" なら自分だけ
            visibility: a.string(),

            // 追加：投稿者のCognito userId
            ownerUserId: a.string(),
            personID: a.id().required(),
            person: a.belongsTo("Person", "personID"),
        })
        .authorization((allow) => [
            // 認証ユーザーは全員読み取り可能
            allow.authenticated().to(["read"]),
            // 投稿者のみ全権限を
            allow
                .ownerDefinedIn("ownerUserId")
                .to(["create", "update", "delete"]),
        ]),

    PublicBoard: a
        .model({
            message: a.string().required(),
            description: a.string(),
            name: a.string(),
            image: a.string(),

            ownerUserId: a.string().required(),

            personID: a.id().required(),
            person: a.belongsTo("Person", "personID"),

            likes: a.hasMany("PublicBoardLike", "publicBoardID"),
        })
        .authorization((allow) => [
            // 認証ユーザーは全員読み取り可能
            allow.authenticated().to(["read"]),

            // 投稿者本人だけ作成・更新・削除可能
            allow
                .ownerDefinedIn("ownerUserId")
                .to(["create", "update", "delete"]),
        ]),

    PrivateBoard: a
        .model({
            message: a.string().required(),
            description: a.string(),
            name: a.string(),
            image: a.string(),

            ownerUserId: a.string().required(),

            personID: a.id().required(),
            person: a.belongsTo("Person", "personID"),
        })
        .authorization((allow) => [
            // 投稿者本人だけ全操作可能
            allow.ownerDefinedIn("ownerUserId"),
        ]),

    PublicBoardLike: a
        .model({
            publicBoardID: a.id().required(),
            publicBoard: a.belongsTo("PublicBoard", "publicBoardID"),

            ownerUserId: a.string().required(),
        })
        .authorization((allow) => [
            // 認証ユーザーはいいね一覧を読める
            allow.authenticated().to(["read"]),

            // いいねした本人だけ作成・削除できる
            allow.ownerDefinedIn("ownerUserId").to(["create", "delete"]),
        ]),

    UserUsage: a
        .model({
            ownerUserId: a.string().required(),

            postCount: a.integer().default(0),
            aiCaptionCount: a.integer().default(0),

            postLimit: a.integer().default(30),
            aiCaptionLimit: a.integer().default(5),
        })
        .authorization((allow) => [allow.ownerDefinedIn("ownerUserId")]),
});
