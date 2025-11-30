/**
 * PROJECT SELECTOR COMPONENT
 * Allows users to select a project before viewing the dashboard
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { IconSearch, IconSparkles, IconRight } from '@/shared/IconSet';

export const ProjectSelector = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axiosSecure.get('/projects/get-projects');
      
      if (response.data.success) {
        setProjects(response.data.data || []);
      } else {
        throw new Error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('❌ Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project) => {
    // Use alias if available for security, fallback to _id
    const projectIdentifier = project.alias || project._id;
    navigate(`/project-dashboard/${projectIdentifier}`);
  };

  const filteredProjects = projects.filter(project => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.projectNumber?.toLowerCase().includes(searchLower) ||
      project.name?.toLowerCase().includes(searchLower) ||
      project.address?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
            <p className="font-bold mb-2">Error Loading Projects</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchProjects}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IconSparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Project Dashboard</h1>
          </div>
          <p className="text-gray-600">Select a project to view its dashboard</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project number, name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Project Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">No projects found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try adjusting your search' : 'No projects available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onSelect={() => handleProjectSelect(project)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Project Card Component
const ProjectCard = ({ project, onSelect }) => {
  const getStatusColor = (status) => {
    const statusMap = {
      'new': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'running': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'on_hold': 'bg-orange-100 text-orange-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const progressStage = project.dashboard?.progressStage || 'design';
  const progressPercentage = project.dashboard?.progressPercentage || 0;

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-primary p-6 group"
    >
      {/* Project Number */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Project
          </span>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
            {project.projectNumber || 'No Number'}
          </h3>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>

      {/* Project Name */}
      <p className="text-sm font-medium text-gray-700 mb-2 line-clamp-2">
        {project.name || 'Unnamed Project'}
      </p>

      {/* Address */}
      {project.address && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-1">
          {project.address}
        </p>
      )}

      {/* Status Badge */}
      {project.status && (
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span className="capitalize">{progressStage}</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      {project.dashboard?.stats && (
        <div className="flex gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
          {project.dashboard.stats.totalFiles > 0 && (
            <span>📄 {project.dashboard.stats.totalFiles} files</span>
          )}
          {project.dashboard.stats.pendingTasks > 0 && (
            <span>✓ {project.dashboard.stats.pendingTasks} tasks</span>
          )}
        </div>
      )}
    </div>
  );
};
