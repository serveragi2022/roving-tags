import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SyncBanner from './SyncBanner';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { colors } from '../utils/theme';

// Layout shared by all screens: sync banner, top bar, content, optional footer, bottom bar.
// scroll={false}: the screen scrolls by itself (FlatList / SectionList) or does not scroll.
// footer: buttons that stay visible above the bottom bar.
// hideNav: hides the bottom bar (used on Setup and Assign Route).
export default function Screen({
  title,
  onBack,
  pillText,
  activeTab,
  hideNav = false,
  scroll = true,
  footer,
  children,
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <SyncBanner />
      <TopBar title={title} onBack={onBack} pillText={pillText} />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>

      {hideNav ? null : <BottomNav active={activeTab} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
