import React from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;

const DetailsScreen = ({ route, navigation }: Props) => {
  const { endpoint, response } = route.params ?? {};

  const pretty = typeof response === 'string' ? response : JSON.stringify(response, null, 2);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{endpoint ?? 'Details'}</Text>
      <Text style={styles.monospaced}>{pretty}</Text>

      <View style={styles.spacer} />
      <Button title="Back" onPress={() => navigation.goBack()} />
      <View style={styles.spacer} />
      <Button title="Back to Home" onPress={() => navigation.navigate('Home')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 12 },
  monospaced: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 6,
    minHeight: 200,
  },
  spacer: { height: 12 },
});

export default DetailsScreen;