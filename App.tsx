import './amplifyConfig';
import { useEffect, useState } from 'react';
import { fetchAuthSession, signOut, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './amplify/data/resource';
import { withAuthenticator } from '@aws-amplify/ui-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ListBoard from './src/features/board/ListBoard';
import CreateBoard from './src/features/board/CreateBoard';
import { PaperProvider } from 'react-native-paper';
import { Hub } from '@aws-amplify/core';
import type { HubPayload } from '@aws-amplify/core';
import CreateProfileScreen from './src/features/board/CreateProfileScreen';

type AmplifyAuthEvent =
    | { event: 'signedIn'; data: { username: string; userId: string } }
    | { event: 'signedOut' }
    | { event: 'signInWithRedirect_failure'; data: { error?: { name: string; message: string } } }
    | { event: 'signInWithRedirect' }
    | { event: 'tokenRefresh' }
    | { event: 'tokenRefresh_failure'; data: { error?: { name: string; message: string } } }
    | { event: 'customOAuthState'; data: string }

type AmplifyAuthHubPayload = HubPayload<AmplifyAuthEvent>;

type Props = {
    onComplete: () => void;
};

const Stack = createNativeStackNavigator();
const client = generateClient<Schema>();

//function App({ user }: { user: any }) {
function App() {
    //if (!user) return null;
    //const [initialized, setInitialized] = useState(false);
    //const [hasProfile, setHasProfile] = useState<boolean>(false);
    //const [user, setUser] = useState(null);
    const [status, setStatus] = useState<'loading' | 'no-profile' | 'ok'>('loading');

    // 👇 これ追加
    //const handleProfileCreated = () => {
    //  setHasProfile(true);
    //};

    useEffect(() => {
        //const listener = Hub.listen('auth', (data) => {
        //    console.log('Auth Event:', data);
        //});
        //if (initialized) return; // 👈 追加

        const init = async () => {
            try {
                // 👇 ここ追加（最初に実行）
                try {
                    await fetchAuthSession();
                } catch {
                    await signOut();
                }
                const user = await getCurrentUser();
                //setUser(user);
                const userId = user.userId;
                console.log('ログイン済み ユーザー情報:', user);
                console.log('username:', user.username);
                console.log('userId:', user.userId);
                console.log('signInDetails:', user.signInDetails);

                const email = user.signInDetails?.loginId;

                //if (!email) return;
                // 既存チェック
                const existing = await client.models.Person.list({
                    filter: { userId: { eq: userId } },
                    authMode: 'userPool', // 👈 ここ
                });
                const exists = existing.data.length > 0;
                console.log("Person list:", JSON.stringify(existing.data, null, 2)); // 👈 追加①

                if (exists) {
                    setStatus('ok');
                } else {
                    setStatus('no-profile');
                }
                //setInitialized(true);

                //if (exists) {
                //    console.log("すでに存在");
                //    console.log("Person name:", JSON.stringify(existing.data[0].name, null, 2)); // 👈 追加②

                //    setHasProfile(true); // ← これが必要
                //    setInitialized(true); // ← これも重要

                //    return;
                //}
                //console.log('Person作成完了');
            } catch (e) {
                console.log('未ログイン or エラー', e);
                setStatus('no-profile');
            }
        };

        init();

        //return () => {
        //  listener();
        //};
    }, []);

    // =========================
    // ローディング
    // =========================
    if (status === 'loading') return null;

    // =========================
    // 初回プロフィール画面
    // =========================
    if (status === 'no-profile') {
        return (
            <CreateProfileScreen
                onComplete={async () => {
                    const existing = await client.models.Person.list({
                        authMode: 'userPool',
                    });
                    setStatus('ok');
                    // setHasProfile(true);
                    // setInitialized(true); // 念のため
                    // setHasProfile(true)}
                    console.log(status);
                }}
            />
        );
    }

    return (
        <PaperProvider>
            <NavigationContainer>
                <Stack.Navigator>
                    <Stack.Screen name="ListBoard" component={ListBoard} />
                    <Stack.Screen name="CreateBoard" component={CreateBoard} />
                </Stack.Navigator>
            </NavigationContainer>
        </PaperProvider>
    );
}

export default withAuthenticator(App, {
    loginMechanisms: ['email', 'phone_number'],
});


