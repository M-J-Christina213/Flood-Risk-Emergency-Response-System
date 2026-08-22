import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { LucideIcon } from 'lucide-react-native';

interface ReportOptionCardProps {
  title: string;
  Icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
}

export const ReportOptionCard: React.FC<ReportOptionCardProps> = ({
  title,
  Icon,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.containerSelected
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        selected && styles.iconContainerSelected
      ]}>
        <Icon size={24} color={selected ? Colors.surface : Colors.primary} />
      </View>
      <Text style={[
        styles.title,
        selected && styles.titleSelected
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  containerSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  titleSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
