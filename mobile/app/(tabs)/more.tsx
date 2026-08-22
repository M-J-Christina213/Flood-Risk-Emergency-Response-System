import React from 'react';
import { StyleSheet, View, SafeAreaView, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { User, MapPin, Bell, Users, HelpCircle, Globe, Info, Shield, ChevronRight } from 'lucide-react-native';

const MENU_ITEMS = [
  { id: 'profile', title: 'Profile', icon: User },
  { id: 'locations', title: 'Saved Locations', icon: MapPin },
  { id: 'notifications', title: 'Notification Settings', icon: Bell },
  { id: 'contacts', title: 'Emergency Contacts', icon: Users },
  { id: 'help', title: 'Help & Support', icon: HelpCircle },
  { id: 'language', title: 'Language', icon: Globe },
  { id: 'about', title: 'About System', icon: Info },
  { id: 'privacy', title: 'Terms & Privacy', icon: Shield },
];

export default function MoreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More Options</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem,
                index === MENU_ITEMS.length - 1 && styles.menuItemLast
              ]}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color={Colors.primary} />
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>FloodSafe App v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 24,
    marginBottom: 40,
  },
});
