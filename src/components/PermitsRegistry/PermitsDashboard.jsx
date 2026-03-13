import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PERMIT_STATUSES } from "../../utils/permitConstants";
import { getPermitStatus } from "../../utils/permitHelpers";
import styles from "./PermitsDashboard.module.scss";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280", "#3b82f6"];

function PermitsDashboard({ permits, isLoading = false }) {
  const total = permits.length;

  const chartData = useMemo(() => {
    const counts = Object.values(PERMIT_STATUSES).map((status) => ({
      name: status,
      value: permits.filter((p) => getPermitStatus(p) === status).length,
      fullValue: status,
    }));
    const sum = counts.reduce((acc, curr) => acc + curr.value, 0);
    return counts.map((item) => ({
      ...item,
      percent: sum > 0 ? Math.round((item.value / sum) * 100) : 0,
    }));
  }, [permits]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipTitle}>{data.name}</p>
          <p className={styles.tooltipValue}>{data.value}</p>
          <p className={styles.tooltipPercent}>({data.percent}%)</p>
        </div>
      );
    }
    return null;
  };

  const Skeleton = ({ className = "" }) => (
    <div className={`${styles.skeleton} ${className}`} />
  );

  const Card = ({ children, className = "" }) => (
    <div className={`${styles.card} ${className}`}>{children}</div>
  );

  const CardHeader = ({ children }) => (
    <div className={styles.cardHeader}>{children}</div>
  );
  const CardTitle = ({ children, className = "" }) => (
    <h3 className={`${styles.cardTitle} ${className}`}>{children}</h3>
  );
  const CardContent = ({ children }) => (
    <div className={styles.cardContent}>{children}</div>
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingHeader}>
          <Skeleton className={styles.loadingTitle} />
          <Skeleton className={styles.loadingSubtitle} />
        </div>
        <div className={styles.loadingCards}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={styles.loadingCard} />
          ))}
        </div>
        <Skeleton className={styles.loadingChart} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Статистика нарядов</h1>
        <p className={styles.headerSubtitle}>
          Всего нарядов:{" "}
          <span className={styles.headerTotal}>
            {total.toLocaleString()}
          </span>
        </p>
      </div>

      <div className={styles.kpiGrid}>
        {chartData.map((item, index) => (
          <Card
            key={item.name}
            className={styles.kpiCard}
          >
            <CardHeader>
              <CardTitle className={styles.kpiTitle}>
                <div
                  className={styles.kpiDot}
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.kpiValue}>{item.value}</p>
              <p className={styles.kpiPercent}>{item.percent}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={styles.chartCard}>
        <CardHeader>
          <CardTitle className={styles.chartTitle}>
            Распределение статусов
          </CardTitle>
        </CardHeader>
        <CardContent className={styles.chartContentOuter}>
          <div className={styles.chartLayout}>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label
                    animationDuration={800}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legendBlock}>
              <Legend />
              <div className={styles.legendList}>
                {chartData
                  .sort((a, b) => b.value - a.value)
                  .map((item, index) => (
                    <div
                      key={item.name}
                      className={styles.legendItem}
                    >
                      <div
                        className={styles.legendDot}
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className={styles.legendText}>
                        <p className={styles.legendName}>{item.name}</p>
                        <p className={styles.legendValue}>
                          {item.value} ({item.percent}%)
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PermitsDashboard;
