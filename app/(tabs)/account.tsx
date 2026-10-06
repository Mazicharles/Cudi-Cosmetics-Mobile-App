import { Alert, Text } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuth } from '../../src/providers/auth';
import { Button, Card, Guard, Screen, styles } from '../../src/components/ui';
export default function Account() {
  const auth = useAuth();
  return (
    <Guard next="/(tabs)/account">
      <Screen>
        <Text style={styles.title}>Your account</Text>
        <Card>
          {auth.user?.user_metadata.avatar_url && (
            <Image
              source={{ uri: auth.user.user_metadata.avatar_url }}
              accessibilityLabel="Your Google profile photo"
              style={{ width: 88, height: 88, borderRadius: 44 }}
            />
          )}
          <Text style={styles.heading}>
            {auth.user?.user_metadata.full_name || 'Welcome'}
          </Text>
          <Text style={styles.text}>{auth.user?.email}</Text>
          <Text style={styles.small}>
            The same Cudi Cosmetics account on web and mobile.
          </Text>
          <Button
            title="Sign out"
            secondary
            onPress={() => {
              void auth
                .signOut()
                .then(() => router.replace('/'))
                .catch(() =>
                  Alert.alert(
                    'Could not sign out',
                    'Please check your connection and try again.',
                  ),
                );
            }}
          />
        </Card>
      </Screen>
    </Guard>
  );
}
