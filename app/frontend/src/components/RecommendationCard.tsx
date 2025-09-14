import React from 'react';
import type { 
  RestaurantRecommendation, 
  ServiceAreaRecommendation, 
  AttractionRecommendation 
} from '../types';
import styles from '../styles/components/RecommendationCard.module.css';

interface RecommendationCardProps {
  type: 'restaurant' | 'serviceArea' | 'attraction';
  data: RestaurantRecommendation | ServiceAreaRecommendation | AttractionRecommendation;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ type, data }) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'restaurant':
        return '🍽️';
      case 'serviceArea':
        return '🛣️';
      case 'attraction':
        return '🏛️';
      default:
        return '📍';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'restaurant':
        return 'レストラン';
      case 'serviceArea':
        return 'サービスエリア';
      case 'attraction':
        return '観光地';
      default:
        return '推奨';
    }
  };

  const getPriceRangeLabel = (priceRange?: string) => {
    switch (priceRange) {
      case 'low':
        return '¥';
      case 'medium':
        return '¥¥';
      case 'high':
        return '¥¥¥';
      default:
        return '';
    }
  };

  const renderRestaurantData = (data: RestaurantRecommendation) => (
    <div className={styles.restaurantContent}>
      <div className={styles.header}>
        <h4 className={styles.name}>{data.name}</h4>
        <div className={styles.badges}>
          <span className={styles.typeBadge}>{data.type}</span>
          <span className={styles.cuisineBadge}>{data.cuisine}</span>
          {data.priceRange && (
            <span className={styles.priceBadge}>
              {getPriceRangeLabel(data.priceRange)}
            </span>
          )}
        </div>
      </div>
      
      <div className={styles.details}>
        <div className={styles.rating}>
          <span className={styles.stars}>⭐</span>
          <span>{data.rating.toFixed(1)}</span>
        </div>
        <div className={styles.distance}>
          <span className={styles.distanceIcon}>📍</span>
          <span>ルートから{data.distanceFromRoute}km</span>
        </div>
        <div className={styles.time}>
          <span className={styles.timeIcon}>⏱️</span>
          <span>滞在時間: {data.estimatedStopTime}分</span>
        </div>
      </div>

      {data.amenities && data.amenities.length > 0 && (
        <div className={styles.amenities}>
          <span className={styles.amenitiesLabel}>設備:</span>
          <div className={styles.amenitiesList}>
            {data.amenities.map((amenity, index) => (
              <span key={index} className={styles.amenity}>
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.hours}>
        <span className={styles.hoursIcon}>🕒</span>
        <span>{data.openingHours}</span>
      </div>

      {data.description && (
        <p className={styles.description}>{data.description}</p>
      )}
    </div>
  );

  const renderServiceAreaData = (data: ServiceAreaRecommendation) => (
    <div className={styles.serviceAreaContent}>
      <div className={styles.header}>
        <h4 className={styles.name}>{data.name}</h4>
        <span className={styles.typeBadge}>{data.type}</span>
      </div>
      
      <div className={styles.details}>
        <div className={styles.distance}>
          <span className={styles.distanceIcon}>📍</span>
          <span>ルートから{data.distanceFromRoute}km</span>
        </div>
        <div className={styles.time}>
          <span className={styles.timeIcon}>⏱️</span>
          <span>滞在時間: {data.estimatedStopTime}分</span>
        </div>
      </div>

      {data.facilities && data.facilities.length > 0 && (
        <div className={styles.facilities}>
          <span className={styles.facilitiesLabel}>設備:</span>
          <div className={styles.facilitiesList}>
            {data.facilities.map((facility, index) => (
              <span key={index} className={styles.facility}>
                {facility}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.hours}>
        <span className={styles.hoursIcon}>🕒</span>
        <span>{data.openingHours}</span>
      </div>

      {data.description && (
        <p className={styles.description}>{data.description}</p>
      )}
    </div>
  );

  const renderAttractionData = (data: AttractionRecommendation) => (
    <div className={styles.attractionContent}>
      <div className={styles.header}>
        <h4 className={styles.name}>{data.name}</h4>
        <span className={styles.typeBadge}>{data.type}</span>
      </div>
      
      <div className={styles.details}>
        <div className={styles.rating}>
          <span className={styles.stars}>⭐</span>
          <span>{data.rating.toFixed(1)}</span>
        </div>
        <div className={styles.distance}>
          <span className={styles.distanceIcon}>📍</span>
          <span>ルートから{data.distanceFromRoute}km</span>
        </div>
        <div className={styles.time}>
          <span className={styles.timeIcon}>⏱️</span>
          <span>観光時間: {data.estimatedVisitTime}分</span>
        </div>
      </div>

      {data.category && data.category.length > 0 && (
        <div className={styles.categories}>
          <span className={styles.categoriesLabel}>カテゴリ:</span>
          <div className={styles.categoriesList}>
            {data.category.map((cat, index) => (
              <span key={index} className={styles.category}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.description && (
        <p className={styles.description}>{data.description}</p>
      )}
    </div>
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.icon}>{getTypeIcon()}</span>
        <span className={styles.typeLabel}>{getTypeLabel()}</span>
      </div>
      
      {type === 'restaurant' && renderRestaurantData(data as RestaurantRecommendation)}
      {type === 'serviceArea' && renderServiceAreaData(data as ServiceAreaRecommendation)}
      {type === 'attraction' && renderAttractionData(data as AttractionRecommendation)}
    </div>
  );
};
