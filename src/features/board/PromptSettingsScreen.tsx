import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  AI_PROMPT_STORAGE_KEY,
  DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION,
  buildBoardAiSystemPrompt,
} from "../../constants/aiPrompt";

type RootStackParamList = {
  ListBoard: undefined;
  CreateBoard: undefined;
  PromptSettings: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PromptSettings"
>;

export default function PromptSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [customInstruction, setCustomInstruction] = useState(
    DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const savedInstruction = await AsyncStorage.getItem(
          AI_PROMPT_STORAGE_KEY,
        );

        if (savedInstruction) {
          setCustomInstruction(savedInstruction);
        }
      } catch (e) {
        console.error("load prompt error:", e);
        Alert.alert("エラー", "プロンプトの読み込みに失敗しました");
      }
    };

    loadPrompt();
  }, []);

  const savePrompt = async () => {
    try {
      if (!customInstruction.trim()) {
        Alert.alert("入力エラー", "プロンプトを入力してください");
        return;
      }

      setSaving(true);

      await AsyncStorage.setItem(
        AI_PROMPT_STORAGE_KEY,
        customInstruction.trim(),
      );

      Alert.alert("保存しました", "プロンプトを保存しました");
      navigation.goBack();
    } catch (e) {
      console.error("save prompt error:", e);
      Alert.alert("エラー", "プロンプトの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const resetPrompt = () => {
    Alert.alert("確認", "デフォルトのプロンプトに戻しますか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "戻す",
        style: "destructive",
        onPress: async () => {
          try {
            setCustomInstruction(DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION);

            await AsyncStorage.setItem(
              AI_PROMPT_STORAGE_KEY,
              DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION,
            );
          } catch (e) {
            console.error("reset prompt error:", e);
            Alert.alert("エラー", "プロンプトのリセットに失敗しました");
          }
        },
      },
    ]);
  };

  const previewSystemPrompt = buildBoardAiSystemPrompt(customInstruction);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall">プロンプト変更</Text>

      <Text
        style={{
          marginTop: 12,
          marginBottom: 12,
          color: "#666",
          lineHeight: 18,
          fontSize: 12,
        }}
      >
        変更できるのは、画像の内容をどのように説明させるかの指示部分だけです。
        JSON形式や出力ルールは固定されています。
      </Text>

      <TextInput
        label="変更できるプロンプト"
        value={customInstruction}
        onChangeText={setCustomInstruction}
        mode="outlined"
        multiline
        style={{
          minHeight: 140,
          fontSize: 14,
        }}
      />

      <Text
        variant="titleSmall"
        style={{
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        実際にAIへ送られるプロンプト
      </Text>

      <TextInput
        value={previewSystemPrompt}
        mode="outlined"
        multiline
        editable={false}
        style={{
          minHeight: 260,
          fontSize: 12,
          backgroundColor: "#f5f5f5",
        }}
      />

      <Button
        mode="contained"
        onPress={savePrompt}
        loading={saving}
        disabled={saving}
        style={{ marginTop: 16 }}
      >
        保存
      </Button>

      <Button
        mode="outlined"
        onPress={resetPrompt}
        disabled={saving}
        style={{ marginTop: 10 }}
      >
        デフォルトに戻す
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        disabled={saving}
        style={{ marginTop: 10 }}
      >
        戻る
      </Button>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
