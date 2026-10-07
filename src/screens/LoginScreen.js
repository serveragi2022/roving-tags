import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import BigButton from "../components/BigButton";
import { useApp } from "../utils/AppContext";
import { canUseApp, describeLoginError, findAccount, makeUser } from "../utils/accounts";
import { loginOnline } from "../services/api";
import { goTo } from "../utils/helpers";
import { cardStyle, colors, textStyles } from "../utils/theme";
import CryptoJS from 'crypto-js';

const HASH_KEY = "@JennelMarasigan";
const SALT = "JennelMarasigan";

const getHashKey = () => {
  return CryptoJS.PBKDF2(HASH_KEY, CryptoJS.enc.Utf8.parse(SALT), {
    keySize: 128 / 32, // 16 bytes
    iterations: 1000,
    hasher: CryptoJS.algo.SHA1,
  });
};

const encryptPassword = (password) => {
  const key = getHashKey();

  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(password),
    key,
    {
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
};

// Login: tries the server first when online. If the server cannot be reached
// (or the phone is offline) it uses the accounts saved on the phone.
export default function LoginScreen({ navigation }) {
  const { isOnline, loginUser, syncAccounts, accountInfo } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleLogin() {
    if (username.trim() === "" || password === "") {
      Alert.alert("Required", "Please enter username and password.");
      return;
    }
    if (isLoading) return; // prevent double taps

    setIsLoading(true);
    try {
      if (isOnline) {
        try {

          const pass = encryptPassword(password);
          const data = await loginOnline(username.trim(), pass);

          const newUser = makeUser(data, username.trim());
          // access_module comes from the login answer
          if (!canUseApp(newUser)) throw new Error("NO_ACCESS");
          loginUser(newUser);
          syncAccounts(newUser.branch).catch(() => {}); // refresh the offline accounts, ignore errors
          goTo(navigation, "Home");
          return;
        } catch (error) {
          if (["INVALID", "NO_API_URL", "NO_ACCESS"].includes(error.message)) {
            Alert.alert("Login Failed", describeLoginError(error));
            return;
          }
          // No connection or server problem: try the accounts saved on the phone
        }
      }

      const account = await findAccount(username, password);
      const savedUser = makeUser(account, account.username);
      if (!canUseApp(savedUser)) throw new Error("NO_ACCESS");
      loginUser(savedUser);
      goTo(navigation, "Home");
    } catch (error) {
      Alert.alert("Login Failed", describeLoginError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    if (!isOnline) {
      Alert.alert(
        "No internet",
        "Connect to the internet to sync the accounts.",
      );
      return;
    }
    setIsSyncing(true);
    try {
      const count = await syncAccounts();
      Alert.alert("Done", `${count} accounts saved on this phone.`);
    } catch (error) {
      Alert.alert("Sync failed", describeLoginError(error));
    }
    setIsSyncing(false);
  }

  return (
    <Screen title="Roving Tags Login" hideNav>
      <View style={[cardStyle, { alignItems: "center" }]}>
        <MaterialIcons name="factory" size={48} color={colors.primary} />
        <Text style={[textStyles.title, { marginTop: 8 }]}>
          AGI Roving Tags
        </Text>
        <Text style={textStyles.label}>
          {isOnline
            ? "Online: login with the server"
            : "Offline: login with saved accounts"}
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={textStyles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Username"
          style={styles.input}
        />
        <Text style={[textStyles.label, { marginTop: 8 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Password"
          style={styles.input}
        />
        <View style={{ height: 8 }} />
        <BigButton
          title={isOnline ? "Login" : "Login (Offline)"}
          icon="login"
          onPress={handleLogin}
          loading={isLoading}
        />
      </View>

      <View style={cardStyle}>
        <Text style={textStyles.heading}>Accounts on this phone</Text>
        <Text style={[textStyles.label, { marginVertical: 6 }]}>
          {accountInfo.count} accounts
          {accountInfo.syncedAt
            ? ` • last sync ${new Date(accountInfo.syncedAt).toLocaleString()}`
            : " • never synced"}
        </Text>
        <BigButton
          title="Sync Accounts"
          icon="sync"
          variant="neutral"
          onPress={handleSync}
          loading={isSyncing}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    marginTop: 4,
  },
});
