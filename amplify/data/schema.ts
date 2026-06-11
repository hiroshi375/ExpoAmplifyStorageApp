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
});
