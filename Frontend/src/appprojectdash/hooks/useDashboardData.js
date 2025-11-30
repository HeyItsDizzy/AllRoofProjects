/**
 * DASHBOARD DATA HOOK
 * Aggregates and manages dashboard data
 */
import { useState, useEffect, useMemo } from 'react';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

const USE_MOCK_DATA = false; // Set to true to use mock data during development

export const useDashboardData = (projectId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const axiosSecure = useAxiosSecure();

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (USE_MOCK_DATA) {
          // Use mock data for development
          await new Promise((resolve) => setTimeout(resolve, 500));
          setRawData(getMockData(projectId));
        } else {
          // Fetch real data from backend
          const response = await axiosSecure.get(`/projects/${projectId}/dashboard`);
          
          if (response.data.success) {
            setRawData(response.data.data);
          } else {
            throw new Error(response.data.message || 'Failed to fetch dashboard data');
          }
        }
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        
        // Fallback to mock data on error during development
        if (process.env.VITE_NODE_ENV === 'development') {
          console.warn('⚠️ Using mock data as fallback');
          setRawData(getMockData(projectId));
        }
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, axiosSecure]);

  const dashboardData = useMemo(() => {
    if (!rawData) return null;
    
    // Transform backend data to match component expectations
    return {
      projectInfo: {
        projectId: rawData.projectId,
        projectNumber: rawData.projectNumber,
        projectName: rawData.projectName,
        clientName: rawData.clientName,
        siteAddress: rawData.projectAddress,
        status: rawData.progress?.currentStage || 'design',
      },
      progress: {
        stage: rawData.progress?.currentStage || 'design',
        percentage: rawData.progress?.percentage || 0,
        lastUpdate: rawData.progress?.lastUpdate,
      },
      latestFiles: rawData.files || [],
      pendingTasks: rawData.tasks || [],
      rustyInsights: rawData.insights || [],
      takeoffs: {
        roofFaces: rawData.takeoffs?.roofFaces || 0,
        wallFaces: rawData.takeoffs?.wallFaces || 0,
        totalFaces: rawData.takeoffs?.totalFaces || 0,
      },
      quotes: {
        draftCount: rawData.quotes?.draftCount || 0,
        latestAmount: rawData.quotes?.latestAmount || 0,
      },
      orders: {
        openCount: rawData.orders?.openCount || 0,
        statusText: rawData.orders?.statusText || 'No open orders',
      },
      files: {
        count: rawData.totalFiles || 0,
        categories: rawData.fileCategories || [],
      },
      supplier: {
        material: rawData.supplier?.materialType || rawData.supplier?.selectedSupplier,
        price: rawData.supplier?.pricePerSqm,
      },
      windRegion: {
        detected: rawData.windRegion?.detectedRegion,
        verified: rawData.windRegion?.verified || false,
      },
      color: {
        selected: rawData.selectedColor,
      },
      stats: rawData.stats || {},
      recentActivity: rawData.recentActivity || [],
    };
  }, [rawData]);

  const refresh = () => {
    setRawData(null);
    setLoading(true);
  };

  return {
    loading,
    error,
    data: dashboardData,
    refresh,
  };
};

// Mock data function for development/fallback
function getMockData(projectId) {
  return {
    projectId: projectId,
    projectNumber: '25-08088',
    projectName: 'Redhill Roof Quote',
    projectAddress: '123 Example St, Redhill, QLD 4000',
    clientName: 'AUS Roofing Group',
    progress: {
      currentStage: 'quoting',
      percentage: 40,
      lastUpdate: new Date().toISOString(),
    },
    files: [
      {
        name: 'plan.pdf',
        size: 2458000,
        uploadedAt: new Date(Date.now() - 3600000).toISOString(),
        category: 'plans',
        uploadedByName: 'John Smith',
        extension: '.pdf',
      },
      {
        name: 'email.eml',
        size: 45000,
        uploadedAt: new Date(Date.now() - 7200000).toISOString(),
        category: 'documents',
        uploadedByName: 'Jane Doe',
        extension: '.eml',
      },
    ],
    fileCategories: [
      { label: 'plans', count: 5 },
      { label: 'documents', count: 3 },
      { label: 'images', count: 4 },
    ],
    totalFiles: 12,
    tasks: [
      {
        _id: '1',
        title: 'Confirm fascia type',
        description: 'Check with client about fascia specifications',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
      },
      {
        _id: '2',
        title: 'Check roof pitch',
        description: 'Verify pitch measurements from plans',
        priority: 'medium',
        status: 'pending',
      },
    ],
    totalTasks: 5,
    pendingTasksCount: 2,
    insights: [
      {
        type: 'warning',
        title: 'Missing wind zone detected',
        description: 'Site location suggests Region C wind zone but not specified in scope',
        action: 'Add wind zone',
      },
    ],
    takeoffs: {
      roofFaces: 13,
      wallFaces: 9,
      totalFaces: 22,
    },
    quotes: {
      draftCount: 1,
      latestAmount: 18420,
    },
    orders: {
      openCount: 0,
      statusText: 'No open orders',
    },
    supplier: {
      selectedSupplier: 'Bluescope',
      materialType: 'Colorbond',
      pricePerSqm: 21.5,
    },
    windRegion: {
      detectedRegion: 'C',
      verified: true,
    },
    selectedColor: 'Surfmist',
    stats: {
      totalFiles: 12,
      totalTasks: 5,
      pendingTasks: 2,
      lastActivity: new Date().toISOString(),
    },
    recentActivity: [],
  };
}
