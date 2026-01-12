import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Volume2, 
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Star,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCourseLessons, Lesson } from "@/hooks/useCourses";
import { useEnrollments } from "@/hooks/useCourses";
import { useUserProgress } from "@/hooks/usePractice";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";

type FilterMode = 'all' | 'mastered' | 'practicing' | 'new';

const Vocabulary = () => {
  const [searchParams] = useSearchParams();
  const lessonIdParam = searchParams.get("lesson");
  
  const { data: enrollments } = useEnrollments();
  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const firstCourseId = enrolledCourseIds[0];
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(firstCourseId || null);
  const selectedLesson = lessons?.find(l => l.id === lessonIdParam) || null;
  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const tts = useTextToSpeech();

  if (lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Lesson Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please select a lesson from the practice page to view its vocabulary.
            </p>
            <Link to="/practice">
              <Button>Go to Practice</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Get all vocabulary items from the lesson
  const categories = Object.keys(selectedLesson.categories || {});
  const allVocabulary: Array<{
    vietnamese: string;
    english: string;
    category: string;
    itemIndex: number;
    mastered: boolean;
    bestScore: number;
    attempts: number;
    masteryLevel: number;
  }> = [];

  categories.forEach(category => {
    const items = selectedLesson.categories?.[category] || [];
    items.forEach((item: any, index: number) => {
      const progress = lessonProgress?.find(
        p => p.category === category && p.item_index === index
      );
      allVocabulary.push({
        vietnamese: item.Vietnamese,
        english: item.English,
        category,
        itemIndex: index,
        mastered: (progress?.mastery_level || 0) >= 3,
        bestScore: progress?.best_score || 0,
        attempts: progress?.attempts || 0,
        masteryLevel: progress?.mastery_level || 0
      });
    });
  });

  // Filter vocabulary
  let filteredVocabulary = allVocabulary;

  // Filter by search query
  if (searchQuery) {
    filteredVocabulary = filteredVocabulary.filter(item =>
      item.vietnamese.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.english.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Filter by mastery status
  if (filterMode === 'mastered') {
    filteredVocabulary = filteredVocabulary.filter(item => item.mastered);
  } else if (filterMode === 'practicing') {
    filteredVocabulary = filteredVocabulary.filter(item => item.attempts > 0 && !item.mastered);
  } else if (filterMode === 'new') {
    filteredVocabulary = filteredVocabulary.filter(item => item.attempts === 0);
  }

  // Filter by category
  if (selectedCategory) {
    filteredVocabulary = filteredVocabulary.filter(item => item.category === selectedCategory);
  }

  // Calculate statistics
  const totalItems = allVocabulary.length;
  const masteredCount = allVocabulary.filter(item => item.mastered).length;
  const practicingCount = allVocabulary.filter(item => item.attempts > 0 && !item.mastered).length;
  const newCount = allVocabulary.filter(item => item.attempts === 0).length;

  // Pagination
  const totalPages = Math.ceil(filteredVocabulary.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVocabulary = filteredVocabulary.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  const handleSpeak = (text: string) => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speak(text);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to={`/practice?lesson=${selectedLesson.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Vocabulary Review
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedLesson.lesson_name}
                </p>
              </div>
            </div>
            <Link to={`/practice?lesson=${selectedLesson.id}`}>
              <Button>
                Start Practicing
              </Button>
            </Link>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase">Total</span>
                </div>
                <p className="text-2xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground uppercase">Mastered</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{masteredCount}</p>
              </CardContent>
            </Card>
            
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground uppercase">Practicing</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{practicingCount}</p>
              </CardContent>
            </Card>
            
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Circle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground uppercase">New</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">{newCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vocabulary..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Filter by Status */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilterMode('all');
                      setCurrentPage(1);
                    }}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterMode === 'mastered' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilterMode('mastered');
                      setCurrentPage(1);
                    }}
                    className={filterMode === 'mastered' ? '' : 'border-green-500/50'}
                  >
                    Mastered
                  </Button>
                  <Button
                    variant={filterMode === 'practicing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilterMode('practicing');
                      setCurrentPage(1);
                    }}
                    className={filterMode === 'practicing' ? '' : 'border-blue-500/50'}
                  >
                    Practicing
                  </Button>
                  <Button
                    variant={filterMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilterMode('new');
                      setCurrentPage(1);
                    }}
                    className={filterMode === 'new' ? '' : 'border-orange-500/50'}
                  >
                    New
                  </Button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  Category:
                </span>
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setCurrentPage(1);
                  }}
                >
                  All Categories
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vocabulary List */}
          <div className="space-y-3">
            {filteredVocabulary.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No vocabulary items found.</p>
                </CardContent>
              </Card>
            ) : (
              paginatedVocabulary.map((item, index) => (
                <motion.div
                  key={`${item.category}-${item.itemIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={cn(
                    "transition-all hover:shadow-md",
                    item.mastered && "border-green-500/30 bg-green-500/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Vietnamese */}
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Vietnamese
                            </span>
                            <p className="text-lg font-medium">{item.vietnamese}</p>
                          </div>

                          {/* English */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                English
                              </span>
                              <p className="text-base text-primary font-medium">
                                {item.english}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSpeak(item.english)}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Category Badge */}
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>

                        {/* Progress Info */}
                        <div className="flex flex-col items-end gap-2">
                          {/* Mastery Status */}
                          {item.mastered ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30">
                              <Star className="w-4 h-4 text-green-600 fill-green-600" />
                              <span className="text-xs font-semibold text-green-600">
                                MASTERED
                              </span>
                            </div>
                          ) : item.attempts > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-600">
                                PRACTICING
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/30">
                              <Circle className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-semibold text-orange-600">
                                NEW
                              </span>
                            </div>
                          )}

                          {/* Stats */}
                          {item.attempts > 0 && (
                            <div className="text-right space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Best Score:</span>
                                <span className={cn(
                                  "text-sm font-bold",
                                  item.bestScore >= 80 ? "text-green-600" :
                                  item.bestScore >= 70 ? "text-blue-600" :
                                  "text-orange-600"
                                )}>
                                  {item.bestScore}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Attempts:</span>
                                <span className="text-sm font-bold">{item.attempts}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredVocabulary.length > 0 && (
            <div className="mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Results Info */}
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredVocabulary.length)} of {filteredVocabulary.length} items
                      {filteredVocabulary.length !== totalItems && (
                        <span className="ml-1">
                          (filtered from {totalItems} total)
                        </span>
                      )}
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {/* First Page */}
                        {currentPage > 2 && (
                          <>
                            <Button
                              variant={currentPage === 1 ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                            >
                              1
                            </Button>
                            {currentPage > 3 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                          </>
                        )}

                        {/* Current and Adjacent Pages */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === currentPage || 
                            page === currentPage - 1 || 
                            page === currentPage + 1
                          )
                          .map(page => (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          ))}

                        {/* Last Page */}
                        {currentPage < totalPages - 1 && (
                          <>
                            {currentPage < totalPages - 2 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === totalPages ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1.5 text-sm border border-border rounded-md bg-background hover:bg-accent cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={filteredVocabulary.length}>All</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Vocabulary;
