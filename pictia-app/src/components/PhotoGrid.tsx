import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ListRenderItem,
  RefreshControl,
} from 'react-native';
import { CachedMediaItem } from '@/types';
import PhotoThumbnail from './PhotoThumbnail';

interface PhotoGridProps {
  mediaItems: CachedMediaItem[];
  selectedItems: Set<string>;
  reviewedItems: Set<string>;
  isMultiSelectMode: boolean;
  isLoading?: boolean;
  onPhotoPress: (item: CachedMediaItem) => void;
  onPhotoLongPress: (item: CachedMediaItem) => void;
  onRefresh?: () => void;
  onEndReached?: () => void;
  numColumns?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const DEFAULT_COLUMNS = 3;
const GRID_SPACING = 2;

const PhotoGrid: React.FC<PhotoGridProps> = ({
  mediaItems,
  selectedItems,
  reviewedItems,
  isMultiSelectMode,
  isLoading = false,
  onPhotoPress,
  onPhotoLongPress,
  onRefresh,
  onEndReached,
  numColumns = DEFAULT_COLUMNS,
}) => {
  // Calculate thumbnail size based on screen width and columns
  const thumbnailSize = useMemo(() => {
    const totalSpacing = GRID_SPACING * (numColumns + 1);
    return (screenWidth - totalSpacing) / numColumns;
  }, [numColumns]);

  // Render item callback
  const renderItem: ListRenderItem<CachedMediaItem> = useCallback(
    ({ item }) => (
      <PhotoThumbnail
        mediaItem={item}
        size={thumbnailSize}
        isSelected={selectedItems.has(item.id)}
        isReviewed={reviewedItems.has(item.id)}
        isMultiSelectMode={isMultiSelectMode}
        onPress={() => onPhotoPress(item)}
        onLongPress={() => onPhotoLongPress(item)}
      />
    ),
    [
      thumbnailSize,
      selectedItems,
      reviewedItems,
      isMultiSelectMode,
      onPhotoPress,
      onPhotoLongPress,
    ]
  );

  // Key extractor
  const keyExtractor = useCallback((item: CachedMediaItem) => item.id, []);

  // Item separator component
  const ItemSeparatorComponent = useCallback(
    () => <View style={{ height: GRID_SPACING }} />,
    []
  );

  // Get item layout for performance optimization
  const getItemLayout = useCallback(
    (data: CachedMediaItem[] | null | undefined, index: number) => ({
      length: thumbnailSize + GRID_SPACING,
      offset: (thumbnailSize + GRID_SPACING) * Math.floor(index / numColumns),
      index,
    }),
    [thumbnailSize, numColumns]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mediaItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: GRID_SPACING },
        ]}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        ItemSeparatorComponent={ItemSeparatorComponent}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        updateCellsBatchingPeriod={50}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingTop: GRID_SPACING,
    paddingBottom: GRID_SPACING,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: GRID_SPACING,
  },
});

export default PhotoGrid;