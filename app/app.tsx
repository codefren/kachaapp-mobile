import { Pressable, Text, View } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-2xl font-bold">Hello 👋</Text>
      <Pressable className="mt-4 rounded-2xl px-4 py-2 bg-blue-500">
        <Text className="text-white font-medium">Let's go</Text>
      </Pressable>
    </View>
  );
}
