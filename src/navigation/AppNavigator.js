import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../utils/AppContext';
import LoginScreen from '../screens/LoginScreen';
import SetupScreen from '../screens/SetupScreen';
import ChecklistsScreen from '../screens/ChecklistsScreen';
import ChecklistEditScreen from '../screens/ChecklistEditScreen';
import AssignChecklistScreen from '../screens/AssignChecklistScreen';
import AssignRouteScreen from '../screens/AssignRouteScreen';
import HomeScreen from '../screens/HomeScreen';
import RouteScreen from '../screens/RouteScreen';
import ScanScreen from '../screens/ScanScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import PhotoScreen from '../screens/PhotoScreen';
import UrgentScreen from '../screens/UrgentScreen';
import ApprovalScreen from '../screens/ApprovalScreen';
import ReviewScreen from '../screens/ReviewScreen';

const Stack = createNativeStackNavigator();

// Flow:
// Login -> Setup (date, mill, shift) -> Assign Route -> Home
// Setup -> Checklists -> Edit Checklist / Assign Checklist to machines
// Home -> Scan -> Checklist -> Photo -> (next stop)       Path A: normal roving
// Home or Checklist -> Urgent -> Approval                  Path B: urgent repair
// Route and History are opened from the bottom bar.
export default function AppNavigator() {
  const { user } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={user ? 'Setup' : 'Login'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Checklists" component={ChecklistsScreen} />
        <Stack.Screen name="ChecklistEdit" component={ChecklistEditScreen} />
        <Stack.Screen name="AssignChecklist" component={AssignChecklistScreen} />
        <Stack.Screen name="AssignRoute" component={AssignRouteScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Route" component={RouteScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Checklist" component={ChecklistScreen} />
        <Stack.Screen name="Photo" component={PhotoScreen} />
        <Stack.Screen name="Urgent" component={UrgentScreen} />
        <Stack.Screen name="Approval" component={ApprovalScreen} />
        <Stack.Screen name="History" component={ReviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
