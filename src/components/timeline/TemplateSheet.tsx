import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { parseISO, setHours, setMinutes, addMinutes, format } from 'date-fns';
import { Colors, Dimensions } from '../../constants';
import { useTemplateStore, useTaskStore, useTimeBlockStore } from '../../store';
import { generateId } from '../../utils';
import type { Template, TimeBlock, TemplateBlock } from '../../types';

interface TemplateSheetProps {
  visible: boolean;
  onClose: () => void;
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  task: Colors.timeBlockTask,
  event: Colors.timeBlockEvent,
  break: Colors.timeBlockBreak,
  focus: Colors.timeBlockFocus,
};

export default function TemplateSheet({ visible, onClose }: TemplateSheetProps) {
  const templates = useTemplateStore((s) => s.templates);
  const addTemplate = useTemplateStore((s) => s.addTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const addTimeBlock = useTimeBlockStore((s) => s.addTimeBlock);
  const [applying, setApplying] = useState(false);

  const applyTemplate = useCallback(
    (template: Template) => {
      const selectedParsed = parseISO(selectedDate);
      const existingDayBlocks = timeBlocks.filter((b) => {
        const bDate = format(parseISO(b.startTime), 'yyyy-MM-dd');
        return bDate === selectedDate;
      });

      const doApply = () => {
        setApplying(true);
        for (const block of template.blocks) {
          const start = setMinutes(setHours(selectedParsed, block.startHour), block.startMinute);
          const end = addMinutes(start, block.durationMinutes);
          const newBlock: TimeBlock = {
            id: generateId(),
            taskId: null,
            title: block.title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            color: block.color,
            type: block.type,
          };
          addTimeBlock(newBlock);
        }
        setApplying(false);
        onClose();
      };

      if (existingDayBlocks.length > 0) {
        Alert.alert(
          'Add Blocks',
          `This will add ${template.blocks.length} block${template.blocks.length !== 1 ? 's' : ''} to your day which already has ${existingDayBlocks.length} block${existingDayBlocks.length !== 1 ? 's' : ''}. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add', onPress: doApply },
          ],
        );
      } else {
        doApply();
      }
    },
    [selectedDate, timeBlocks, addTimeBlock, onClose],
  );

  const saveCurrentAsTemplate = useCallback(() => {
    const selectedParsed = parseISO(selectedDate);
    const dayBlocks = timeBlocks.filter((b) => {
      return format(parseISO(b.startTime), 'yyyy-MM-dd') === selectedDate;
    });

    if (dayBlocks.length === 0) {
      Alert.alert('No Blocks', 'Add some time blocks to your day first before saving as a template.');
      return;
    }

    const templateBlocks: TemplateBlock[] = dayBlocks.map((b) => {
      const start = parseISO(b.startTime);
      const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
      return {
        title: b.title,
        type: b.type,
        startHour: start.getHours(),
        startMinute: start.getMinutes(),
        durationMinutes: Math.max(15, Math.round(dur)),
        color: b.color,
      };
    });

    const now = new Date().toISOString();
    const template: Template = {
      id: generateId(),
      name: `My ${format(selectedParsed, 'EEEE')} Plan`,
      icon: '\u{2B50}',
      blocks: templateBlocks,
      createdAt: now,
      updatedAt: now,
    };

    addTemplate(template);
    Alert.alert('Saved', `Template "${template.name}" has been created.`);
  }, [selectedDate, timeBlocks, addTemplate]);

  const confirmDeleteTemplate = useCallback(
    (template: Template) => {
      Alert.alert(
        'Delete Template',
        `Delete "${template.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(template.id) },
        ],
      );
    },
    [deleteTemplate],
  );

  // Mini preview of block layout (0-24h)
  function BlockPreview({ blocks }: { blocks: TemplateBlock[] }) {
    return (
      <View style={styles.previewContainer}>
        {blocks.map((block, i) => {
          const startFraction = (block.startHour + block.startMinute / 60) / 24;
          const widthFraction = block.durationMinutes / (24 * 60);
          return (
            <View
              key={i}
              style={[
                styles.previewBlock,
                {
                  left: `${startFraction * 100}%` as unknown as number,
                  width: `${Math.max(widthFraction * 100, 2)}%` as unknown as number,
                  backgroundColor: BLOCK_TYPE_COLORS[block.type] || block.color,
                },
              ]}
            />
          );
        })}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Templates</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Close templates"
          >
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateIcon}>{template.icon}</Text>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateMeta}>
                    {template.blocks.length} block{template.blocks.length !== 1 ? 's' : ''}
                    {' \u00B7 '}
                    {formatBlockRange(template.blocks)}
                  </Text>
                </View>
              </View>
              <BlockPreview blocks={template.blocks} />
              <View style={styles.templateActions}>
                <Pressable
                  onPress={() => applyTemplate(template)}
                  disabled={applying}
                  style={({ pressed }) => [
                    styles.applyButton,
                    pressed && styles.applyButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${template.name} template`}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteTemplate(template)}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.deleteButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${template.name} template`}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {templates.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'\u{1F4CB}'}</Text>
              <Text style={styles.emptyTitle}>No Templates</Text>
              <Text style={styles.emptySubtitle}>
                Save your current day as a template to reuse later.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={saveCurrentAsTemplate}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save current day as template"
          >
            <Text style={styles.saveIcon}>{'\u2B50'}</Text>
            <Text style={styles.saveText}>Save Current Day as Template</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function formatBlockRange(blocks: TemplateBlock[]): string {
  if (blocks.length === 0) return '';
  const sorted = [...blocks].sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startStr = formatHourMinute(first.startHour, first.startMinute);
  const endMin = last.startHour * 60 + last.startMinute + last.durationMinutes;
  const endStr = formatHourMinute(Math.floor(endMin / 60), endMin % 60);
  return `${startStr} - ${endStr}`;
}

function formatHourMinute(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Dimensions.fontXL,
    fontWeight: '800',
    color: Colors.text,
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeButtonPressed: {
    backgroundColor: Colors.surfaceTertiary,
  },
  closeText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Dimensions.screenPadding,
    gap: 12,
  },
  templateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateIcon: {
    fontSize: 28,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: Dimensions.fontLG,
    fontWeight: '700',
    color: Colors.text,
  },
  templateMeta: {
    fontSize: Dimensions.fontXS,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewContainer: {
    height: 8,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBlock: {
    position: 'absolute',
    top: 0,
    height: 8,
    borderRadius: 2,
    opacity: 0.85,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  applyText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '600',
    color: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Dimensions.fontLG,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: Dimensions.screenPadding,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryMuted,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveButtonPressed: {
    backgroundColor: Colors.primaryLight + '30',
  },
  saveIcon: {
    fontSize: 16,
  },
  saveText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '700',
    color: Colors.primary,
  },
});
