import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useConvexAuth } from '../../hooks/useConvexAuth';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function PerformanceTest() {
  const { getClientId } = useConvexAuth();
  const clientId = getClientId();
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Test original vs optimized candidate queries
  const originalTest = useQuery(api.performanceTest.testCandidatePerformance, 
    isRunning && clientId ? {
      clientId,
      testOptimized: false,
    } : "skip"
  );
  
  const optimizedTest = useQuery(api.performanceTest.testCandidatePerformance, 
    isRunning && clientId ? {
      clientId,  
      testOptimized: true,
    } : "skip"
  );
  
  // Search performance test
  const searchTest = useQuery(api.performanceTest.compareSearchPerformance,
    isRunning && clientId ? {
      clientId,
      searchTerm: "john",
    } : "skip"
  );
  
  const handleRunTest = () => {
    setIsRunning(true);
    setTestResults(null);
  };
  
  // Collect results when both tests complete
  if (isRunning && originalTest && optimizedTest && searchTest && !testResults) {
    const results = {
      candidate: {
        original: originalTest,
        optimized: optimizedTest,
        improvement: {
          timeReduction: originalTest.executionTimeMs - optimizedTest.executionTimeMs,
          percentImprovement: ((originalTest.executionTimeMs - optimizedTest.executionTimeMs) / originalTest.executionTimeMs * 100),
        }
      },
      search: searchTest,
    };
    setTestResults(results);
    setIsRunning(false);
  }
  
  if (!clientId) {
    return <div>Please log in to run performance tests</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 Convex Performance Optimization Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex gap-4">
            <Button 
              onClick={handleRunTest} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? '🧪 Running Tests...' : '▶️ Run Performance Tests'}
            </Button>
          </div>
          
          {isRunning && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Running candidate query tests... {originalTest ? '✅' : '⏳'} Original | {optimizedTest ? '✅' : '⏳'} Optimized
              </div>
              <div className="text-sm text-gray-600">
                Running search tests... {searchTest ? '✅' : '⏳'} Search comparison
              </div>
            </div>
          )}
          
          {testResults && (
            <div className="space-y-6">
              
              {/* Candidate Query Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📊 Candidate Query Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">❌ Original Method</h4>
                      <div className="text-sm space-y-1">
                        <div>⏱️ Time: <strong>{testResults.candidate.original.executionTimeMs}ms</strong></div>
                        <div>🔍 Contacts Scanned: <strong>{testResults.candidate.original.queryDetails.contactsScanned.toLocaleString()}</strong></div>
                        <div>💾 Memory: {testResults.candidate.original.memoryUsage}</div>
                        <div>🔄 Batch Queries: {testResults.candidate.original.queryDetails.batchQueriesUsed ? '✅' : '❌'}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-600">✅ Optimized Method</h4>
                      <div className="text-sm space-y-1">
                        <div>⏱️ Time: <strong>{testResults.candidate.optimized.executionTimeMs}ms</strong></div>
                        <div>🔍 Contacts Scanned: <strong>{testResults.candidate.optimized.queryDetails.contactsScanned.toLocaleString()}</strong></div>
                        <div>💾 Memory: {testResults.candidate.optimized.memoryUsage}</div>
                        <div>🔄 Batch Queries: {testResults.candidate.optimized.queryDetails.batchQueriesUsed ? '✅' : '❌'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800">📈 Performance Improvement</h4>
                    <div className="text-sm mt-2 space-y-1">
                      <div>⚡ Time Saved: <strong>{testResults.candidate.improvement.timeReduction}ms</strong></div>
                      <div>📊 Speed Improvement: <strong>{testResults.candidate.improvement.percentImprovement.toFixed(1)}%</strong></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Search Performance Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔍 Search Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">❌ collect() + filter</h4>
                      <div className="text-sm space-y-1">
                        <div>⏱️ Time: <strong>{testResults.search.oldMethod.executionTimeMs}ms</strong></div>
                        <div>🔍 Records Scanned: <strong>{testResults.search.oldMethod.recordsScanned.toLocaleString()}</strong></div>
                        <div>📊 Results: <strong>{testResults.search.oldMethod.resultsFound}</strong></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-600">✅ Indexed Query</h4>
                      <div className="text-sm space-y-1">
                        <div>⏱️ Time: <strong>{testResults.search.newMethod.executionTimeMs}ms</strong></div>
                        <div>🔍 Records Scanned: <strong>{testResults.search.newMethod.recordsScanned.toLocaleString()}</strong></div>
                        <div>📊 Results: <strong>{testResults.search.newMethod.resultsFound}</strong></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800">🎯 Search Optimization Impact</h4>
                    <div className="text-sm mt-2 space-y-1">
                      <div>⚡ Time Saved: <strong>{testResults.search.improvement.timeSavedMs}ms</strong></div>
                      <div>📊 Speed Improvement: <strong>{testResults.search.improvement.timeSavedPercent}%</strong></div>
                      <div>🔍 Scan Reduction: <strong>{testResults.search.improvement.scanReduction.toLocaleString()} fewer records</strong></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎉 Optimization Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>✅ Key Improvements Implemented:</strong>
                      <ul className="mt-2 ml-4 space-y-1">
                        <li>• Replaced collect() anti-pattern with indexed queries</li>
                        <li>• Eliminated N+1 query patterns with batch queries</li>
                        <li>• Added proper pagination with cursors</li>
                        <li>• Used denormalized data to reduce joins</li>
                        <li>• Added search indexes for full-text search</li>
                      </ul>
                    </div>
                    
                    <div className="text-sm">
                      <strong>📈 Expected Production Impact:</strong>
                      <ul className="mt-2 ml-4 space-y-1">
                        <li>• {testResults.candidate.improvement.percentImprovement.toFixed(0)}% faster candidate selection</li>
                        <li>• {testResults.search.improvement.timeSavedPercent}% faster contact search</li>
                        <li>• Reduced memory usage and database load</li>
                        <li>• Better scalability with more contacts</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
}