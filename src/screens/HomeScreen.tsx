import React, { useState } from 'react';
import { View, Text, Button, Platform, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const HomeScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const callEndpoint = async (path: string, label: string) => {
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      const text = await res.text();
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // keep raw text if not JSON
      }
      navigation.navigate('Details', { endpoint: label, response: data });
    } catch (err: any) {
      setLastError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>API Test — Home</Text>

      <Button
        title="Test Sentiment (analyze-multiple-tweets-sentiment)"
        onPress={() => callEndpoint('/api/analyze-multiple-tweets-sentiment', 'Sentiment')}
      />

      <View style={styles.spacer} />

      <Button
        title="Test Trends (analyze-trends)"
        onPress={() => callEndpoint('/api/analyze-trends', 'Trends')}
      />

      <View style={styles.spacer} />

      <Button
        title="Insights (generate-insights)"
        onPress={() => callEndpoint('/api/generate-insights', 'Insights')}
      />

      <View style={styles.spacer} />

      <Button
        title="Summary (generate-summary)"
        onPress={() => callEndpoint('/api/generate-summary', 'Summary')}
      />

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {lastError && <Text style={styles.error}>Error: {lastError}</Text>}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 16 },
  spacer: { height: 12 },
  error: { color: 'red', marginTop: 12 },
});

export default HomeScreen;