export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          program_id: string | null
          section: string | null
          semester_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          section?: string | null
          semester_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          section?: string | null
          semester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          created_at: string
          credit_hours: number | null
          department_id: string
          id: string
          is_active: boolean
          program_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          department_id: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          department_id?: string
          id?: string
          is_active?: boolean
          program_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          short_name: string | null
          slug: string
          university_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          short_name?: string | null
          slug: string
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
          slug?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          person_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          person_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          person_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          breakdown_min_reviews: number
          id: number
          ranking_min_reviews: number
          trending_min_reviews: number
          trending_window_days: number
          updated_at: string
        }
        Insert: {
          breakdown_min_reviews?: number
          id?: number
          ranking_min_reviews?: number
          trending_min_reviews?: number
          trending_window_days?: number
          updated_at?: string
        }
        Update: {
          breakdown_min_reviews?: number
          id?: number
          ranking_min_reviews?: number
          trending_min_reviews?: number
          trending_window_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          person_id: string
          student_id: string
          viewed_at: string
        }
        Insert: {
          person_id: string
          student_id: string
          viewed_at?: string
        }
        Update: {
          person_id?: string
          student_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          full_name: string
          headline: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          primary_category:
            | Database["public"]["Enums"]["person_category"]
            | null
          slug: string
          teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          title_prefix: string | null
          university_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name: string
          headline?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          gender?: Database["public"]["Enums"]["person_gender"] | null
          photo_url?: string | null
          primary_category?:
            | Database["public"]["Enums"]["person_category"]
            | null
          slug: string
          teacher_type?: Database["public"]["Enums"]["teacher_type"] | null
          title_prefix?: string | null
          university_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          gender?: Database["public"]["Enums"]["person_gender"] | null
          photo_url?: string | null
          primary_category?:
            | Database["public"]["Enums"]["person_category"]
            | null
          slug?: string
          teacher_type?: Database["public"]["Enums"]["teacher_type"] | null
          title_prefix?: string | null
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      person_roles: {
        Row: {
          category: Database["public"]["Enums"]["person_category"]
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          is_auto: boolean
          is_primary: boolean
          person_id: string
          position_id: string | null
          title_override: string | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["person_category"]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          is_auto?: boolean
          is_primary?: boolean
          person_id: string
          position_id?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["person_category"]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          is_auto?: boolean
          is_primary?: boolean
          person_id?: string
          position_id?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_roles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          category: Database["public"]["Enums"]["person_category"] | null
          created_at: string
          id: string
          is_active: boolean
          rank: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["person_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          rank?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["person_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          rank?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["program_level"]
          name: string
          short_name: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["program_level"]
          name: string
          short_name?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["program_level"]
          name?: string
          short_name?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_current: boolean
          label: string
          season: Database["public"]["Enums"]["semester_season"]
          slug: string
          starts_on: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          label: string
          season: Database["public"]["Enums"]["semester_season"]
          slug: string
          starts_on?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          label?: string
          season?: Database["public"]["Enums"]["semester_season"]
          slug?: string
          starts_on?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      home_images: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_notifications: {
        Row: {
          created_at: string
          cta_label: string | null
          ends_at: string | null
          href: string | null
          id: string
          is_active: boolean
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          starts_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          href?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          category: Database["public"]["Enums"]["person_category"]
          course_offering_id: string
          created_at: string
          id: string
          is_active: boolean
          person_id: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["person_category"]
          course_offering_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          person_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["person_category"]
          course_offering_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          university_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      review_answers: {
        Row: {
          bool_value: boolean | null
          criterion_id: string
          review_id: string
          star_value: number | null
        }
        Insert: {
          bool_value?: boolean | null
          criterion_id: string
          review_id: string
          star_value?: number | null
        }
        Update: {
          bool_value?: boolean | null
          criterion_id?: string
          review_id?: string
          star_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_answers_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "review_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_answers_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_authors: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["person_category"] | null
          course_id: string | null
          created_at: string
          person_id: string
          review_id: string
          semester_id: string | null
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["person_category"] | null
          course_id?: string | null
          created_at?: string
          person_id: string
          review_id: string
          semester_id?: string | null
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["person_category"] | null
          course_id?: string | null
          created_at?: string
          person_id?: string
          review_id?: string
          semester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_authors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_authors_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_authors_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_authors_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      review_criteria: {
        Row: {
          category: Database["public"]["Enums"]["person_category"]
          created_at: string
          help_text: string | null
          id: string
          is_active: boolean
          key: string
          kind: Database["public"]["Enums"]["review_criterion_kind"]
          label: string
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["person_category"]
          created_at?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          key: string
          kind: Database["public"]["Enums"]["review_criterion_kind"]
          label: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["person_category"]
          created_at?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          key?: string
          kind?: Database["public"]["Enums"]["review_criterion_kind"]
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          category: Database["public"]["Enums"]["person_category"]
          comment: string | null
          course_id: string | null
          created_at: string
          edit_count: number
          id: string
          is_featured: boolean
          moderation_status: Database["public"]["Enums"]["review_moderation_status"]
          overall_rating: number
          person_id: string
          semester_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["person_category"]
          comment?: string | null
          course_id?: string | null
          created_at?: string
          edit_count?: number
          id?: string
          is_featured?: boolean
          moderation_status?: Database["public"]["Enums"]["review_moderation_status"]
          overall_rating: number
          person_id: string
          semester_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["person_category"]
          comment?: string | null
          course_id?: string | null
          created_at?: string
          edit_count?: number
          id?: string
          is_featured?: boolean
          moderation_status?: Database["public"]["Enums"]["review_moderation_status"]
          overall_rating?: number
          person_id?: string
          semester_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email_domains: string[]
          full_name: string
          id: string
          is_active: boolean
          short_name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email_domains?: string[]
          full_name: string
          id?: string
          is_active?: boolean
          short_name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email_domains?: string[]
          full_name?: string
          id?: string
          is_active?: boolean
          short_name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      person_criteria_stats: {
        Row: {
          average_star: number | null
          bool_responses: number | null
          category: Database["public"]["Enums"]["person_category"] | null
          criterion_id: string | null
          key: string | null
          kind: Database["public"]["Enums"]["review_criterion_kind"] | null
          label: string | null
          person_id: string | null
          sort_order: number | null
          star_responses: number | null
          yes_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_rating_stats: {
        Row: {
          average_rating: number | null
          count_1: number | null
          count_2: number | null
          count_3: number | null
          count_4: number | null
          count_5: number | null
          count_6: number | null
          count_7: number | null
          count_8: number | null
          count_9: number | null
          count_10: number | null
          person_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_add_assignment: {
        Args: {
          p_person_id: string
          p_course_id: string
          p_semester_id: string
          p_section: string | null
          p_category: Database["public"]["Enums"]["person_category"] | null
        }
        Returns: string
      }
      admin_add_role: {
        Args: {
          p_person_id: string
          p_category: Database["public"]["Enums"]["person_category"]
          p_department_id: string | null
          p_position_id: string | null
          p_is_primary: boolean
        }
        Returns: string
      }
      admin_audit_list: {
        Args: { p_entity_type: string | null; p_limit: number; p_offset: number }
        Returns: {
          id: string
          actor_id: string | null
          actor_email: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
          total_count: number
        }[]
      }
      admin_courses_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          code: string | null
          slug: string
          credit_hours: number | null
          is_active: boolean
          department_id: string | null
          department_name: string | null
          program_id: string | null
          program_name: string | null
          offering_count: number
        }[]
      }
      admin_create_person: {
        Args: {
          p_full_name: string
          p_category: Database["public"]["Enums"]["person_category"]
          p_gender: Database["public"]["Enums"]["person_gender"] | null
          p_teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          p_department_id: string | null
          p_position_id: string | null
          p_display_name: string | null
          p_headline: string | null
        }
        Returns: string
      }
      admin_departments_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          short_name: string | null
          slug: string
          is_active: boolean
          university_id: string
          program_count: number
          course_count: number
          role_count: number
        }[]
      }
      admin_get_person: {
        Args: { p_person_id: string }
        Returns: {
          id: string
          full_name: string
          display_name: string | null
          title_prefix: string | null
          headline: string | null
          bio: string | null
          slug: string
          gender: Database["public"]["Enums"]["person_gender"] | null
          primary_category: Database["public"]["Enums"]["person_category"] | null
          teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          is_active: boolean
          is_verified: boolean
        }[]
      }
      admin_people_list: {
        Args: {
          p_category: Database["public"]["Enums"]["person_category"] | null
          p_search: string | null
          p_status: string | null
          p_limit: number
          p_offset: number
        }
        Returns: {
          id: string
          full_name: string
          display_name: string | null
          slug: string
          primary_category: Database["public"]["Enums"]["person_category"] | null
          teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          headline: string | null
          is_active: boolean
          is_verified: boolean
          role_count: number
          review_count: number
          total_count: number
        }[]
      }
      admin_person_assignments: {
        Args: { p_person_id: string }
        Returns: {
          id: string
          course_offering_id: string
          course_id: string
          course_title: string
          semester_id: string
          semester_label: string
          section: string | null
          category: Database["public"]["Enums"]["person_category"]
          is_active: boolean
        }[]
      }
      admin_person_roles: {
        Args: { p_person_id: string }
        Returns: {
          id: string
          category: Database["public"]["Enums"]["person_category"]
          department_id: string | null
          department_name: string | null
          position_id: string | null
          position_title: string | null
          title_override: string | null
          is_primary: boolean
          is_active: boolean
        }[]
      }
      admin_positions_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          slug: string
          rank: number
          category: Database["public"]["Enums"]["person_category"] | null
          is_active: boolean
          role_count: number
        }[]
      }
      admin_programs_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          short_name: string | null
          slug: string
          level: Database["public"]["Enums"]["program_level"]
          is_active: boolean
          department_id: string
          department_name: string | null
          course_count: number
        }[]
      }
      admin_semesters_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          label: string
          season: Database["public"]["Enums"]["semester_season"]
          year: number
          slug: string
          is_current: boolean
          starts_on: string | null
          ends_on: string | null
          offering_count: number
        }[]
      }
      admin_set_assignment_active: {
        Args: { p_assignment_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_set_course_active: {
        Args: { p_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_set_department_active: {
        Args: { p_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_set_position_active: {
        Args: { p_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_set_primary_role: {
        Args: { p_role_id: string }
        Returns: undefined
      }
      admin_set_program_active: {
        Args: { p_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_set_role_active: {
        Args: { p_role_id: string; p_active: boolean }
        Returns: undefined
      }
      admin_students_list: {
        Args: {
          p_search: string | null
          p_status: string | null
          p_limit: number
          p_offset: number
        }
        Returns: {
          id: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          is_active: boolean
          created_at: string
          total_count: number
        }[]
      }
      admin_update_person: {
        Args: {
          p_id: string
          p_full_name: string
          p_display_name: string | null
          p_title_prefix: string | null
          p_headline: string | null
          p_bio: string | null
          p_gender: Database["public"]["Enums"]["person_gender"] | null
          p_teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          p_is_verified: boolean
        }
        Returns: string
      }
      admin_upsert_course: {
        Args: {
          p_id: string | null
          p_title: string
          p_code: string | null
          p_credit_hours: number | null
          p_department_id: string
          p_program_id: string | null
          p_is_active: boolean
        }
        Returns: string
      }
      admin_upsert_department: {
        Args: {
          p_id: string | null
          p_name: string
          p_short_name: string | null
          p_is_active: boolean
        }
        Returns: string
      }
      admin_upsert_position: {
        Args: {
          p_id: string | null
          p_title: string
          p_rank: number | null
          p_category: Database["public"]["Enums"]["person_category"] | null
          p_is_active: boolean
        }
        Returns: string
      }
      admin_upsert_program: {
        Args: {
          p_id: string | null
          p_name: string
          p_short_name: string | null
          p_level: Database["public"]["Enums"]["program_level"] | null
          p_department_id: string
          p_is_active: boolean
        }
        Returns: string
      }
      admin_upsert_semester: {
        Args: {
          p_id: string | null
          p_label: string
          p_season: Database["public"]["Enums"]["semester_season"] | null
          p_year: number
          p_is_current: boolean
          p_starts_on: string | null
          p_ends_on: string | null
        }
        Returns: string
      }
      admin_criteria_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          category: Database["public"]["Enums"]["person_category"]
          key: string
          label: string
          help_text: string | null
          kind: Database["public"]["Enums"]["review_criterion_kind"]
          sort_order: number
          is_active: boolean
          answer_count: number
        }[]
      }
      admin_delete_notification: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_feature_flags: {
        Args: Record<PropertyKey, never>
        Returns: {
          key: string
          label: string
          is_enabled: boolean
          enabled_now: boolean
          starts_at: string | null
          ends_at: string | null
          updated_at: string
        }[]
      }
      admin_feedback_queue: {
        Args: {
          p_status?: Database["public"]["Enums"]["website_feedback_status"] | null
          p_type?: Database["public"]["Enums"]["website_feedback_type"] | null
          p_search?: string | null
          p_important_only?: boolean
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          feedback_id: string
          feedback_type: Database["public"]["Enums"]["website_feedback_type"]
          experience_rating: number | null
          message: string
          contact_email: string | null
          status: Database["public"]["Enums"]["website_feedback_status"]
          is_important: boolean
          from_student: boolean
          created_at: string
          reviewed_at: string | null
          total_count: number
        }[]
      }
      admin_merge_people: {
        Args: { p_canonical_id: string; p_duplicate_id: string; p_reason: string }
        Returns: undefined
      }
      admin_add_home_image: {
        Args: { p_storage_path: string; p_alt_text?: string }
        Returns: string
      }
      admin_delete_home_image: {
        Args: { p_id: string }
        Returns: string
      }
      admin_home_image_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          storage_path: string
          alt_text: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }[]
      }
      admin_notification_list: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          title: string | null
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          href: string | null
          cta_label: string | null
          is_active: boolean
          starts_at: string | null
          ends_at: string | null
          is_live_now: boolean
          created_at: string
          updated_at: string
          total_count: number
        }[]
      }
      admin_report_queue: {
        Args: {
          p_status?: Database["public"]["Enums"]["report_status"]
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          report_id: string
          person_id: string
          person_slug: string
          person_name: string
          is_active: boolean
          reason: Database["public"]["Enums"]["report_reason"]
          details: string | null
          status: Database["public"]["Enums"]["report_status"]
          created_at: string
          reviewed_at: string | null
          resolution_note: string | null
          report_count: number
          total_count: number
        }[]
      }
      admin_reset_person_reviews: {
        Args: { p_person_id: string; p_reason: string }
        Returns: number
      }
      admin_upsert_criterion: {
        Args: {
          p_id: string | null
          p_category: Database["public"]["Enums"]["person_category"]
          p_key: string
          p_label: string
          p_help_text: string | null
          p_kind: Database["public"]["Enums"]["review_criterion_kind"]
          p_sort_order: number
          p_is_active: boolean
        }
        Returns: string
      }
      admin_upsert_notification: {
        Args: {
          p_id: string | null
          p_title: string | null
          p_message: string
          p_priority: Database["public"]["Enums"]["notification_priority"]
          p_href: string | null
          p_cta_label: string | null
          p_is_active: boolean
          p_starts_at: string | null
          p_ends_at: string | null
        }
        Returns: string
      }
      feature_enabled: {
        Args: { p_key: string }
        Returns: boolean
      }
      resolve_report: {
        Args: { p_report_id: string; p_action: string; p_note?: string | null }
        Returns: undefined
      }
      set_feature_flag: {
        Args: {
          p_key: string
          p_enabled?: boolean | null
          p_starts_at?: string | null
          p_ends_at?: string | null
          p_clear_schedule?: boolean
        }
        Returns: undefined
      }
      set_person_active: {
        Args: { p_person_id: string; p_active: boolean; p_reason: string }
        Returns: undefined
      }
      submit_person_report: {
        Args: {
          p_person_id: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_details?: string | null
        }
        Returns: string
      }
      submit_website_feedback: {
        Args: {
          p_type: Database["public"]["Enums"]["website_feedback_type"]
          p_rating: number | null
          p_message: string
          p_contact_email?: string | null
        }
        Returns: string
      }
      update_feedback: {
        Args: {
          p_feedback_id: string
          p_status?: Database["public"]["Enums"]["website_feedback_status"] | null
          p_important?: boolean | null
        }
        Returns: undefined
      }
      write_audit: {
        Args: {
          p_action: string
          p_entity_type: string
          p_entity_id?: string | null
          p_details?: Json | null
        }
        Returns: string
      }
      admin_review_queue: {
        Args: {
          p_status?: Database["public"]["Enums"]["review_moderation_status"]
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          review_id: string
          person_id: string
          person_slug: string
          person_name: string
          category: Database["public"]["Enums"]["person_category"]
          overall_rating: number
          comment: string | null
          is_featured: boolean
          course_title: string | null
          semester_label: string | null
          created_at: string
          total_count: number
        }[]
      }
      breakdown_min_reviews: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      compare_people: {
        Args: {
          p_ids: string[]
          p_category?: Database["public"]["Enums"]["person_category"]
        }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          criteria: Json
        }[]
      }
      course_teachers: {
        Args: { p_course_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          course_average: number | null
          course_review_count: number | null
          semesters_taught: number
          total_count: number
        }[]
      }
      delete_my_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      directory_courses: {
        Args: {
          p_search?: string | null
          p_department_id?: string | null
          p_semester_id?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          course_id: string
          slug: string
          code: string | null
          title: string
          credit_hours: number | null
          department_name: string | null
          department_short: string | null
          teacher_count: number
          total_count: number
        }[]
      }
      directory_people: {
        Args: {
          p_category: Database["public"]["Enums"]["person_category"]
          p_search?: string | null
          p_department_id?: string | null
          p_course_id?: string | null
          p_semester_id?: string | null
          p_min_rating?: number | null
          p_teacher_type?: Database["public"]["Enums"]["teacher_type"] | null
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          primary_category:
            | Database["public"]["Enums"]["person_category"]
            | null
          teacher_type: Database["public"]["Enums"]["teacher_type"] | null
          role_title: string | null
          department_name: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          total_count: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_verified_student: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      moderate_review: {
        Args: { p_review_id: string; p_action: string }
        Returns: undefined
      }
      most_reviewed: {
        Args: {
          p_category?: Database["public"]["Enums"]["person_category"] | null
          p_limit?: number
        }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          category: Database["public"]["Enums"]["person_category"]
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
        }[]
      }
      my_favorite_person_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      my_favorites: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          primary_category:
            | Database["public"]["Enums"]["person_category"]
            | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          saved_at: string
          total_count: number
        }[]
      }
      my_recently_viewed: {
        Args: { p_limit?: number }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          primary_category:
            | Database["public"]["Enums"]["person_category"]
            | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          viewed_at: string
        }[]
      }
      my_review_for_person: {
        Args: {
          p_person_id: string
          p_course_id?: string | null
          p_semester_id?: string | null
        }
        Returns: {
          review_id: string
          person_id: string
          person_slug: string
          person_name: string
          category: Database["public"]["Enums"]["person_category"]
          overall_rating: number
          comment: string | null
          status: Database["public"]["Enums"]["review_status"]
          moderation_status: Database["public"]["Enums"]["review_moderation_status"]
          edit_count: number
          edits_left: number
          course_id: string | null
          course_code: string | null
          course_title: string | null
          semester_id: string | null
          semester_label: string | null
          created_at: string
          updated_at: string
          answers: Json
        }[]
      }
      my_review_scopes: {
        Args: Record<PropertyKey, never>
        Returns: {
          person_id: string
          course_id: string | null
          semester_id: string | null
        }[]
      }
      my_reviewed_person_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      my_reviews: {
        Args: Record<PropertyKey, never>
        Returns: {
          review_id: string
          person_id: string
          person_slug: string
          person_name: string
          category: Database["public"]["Enums"]["person_category"]
          overall_rating: number
          comment: string | null
          status: Database["public"]["Enums"]["review_status"]
          moderation_status: Database["public"]["Enums"]["review_moderation_status"]
          edit_count: number
          edits_left: number
          course_id: string | null
          course_code: string | null
          course_title: string | null
          semester_id: string | null
          semester_label: string | null
          created_at: string
          updated_at: string
        }[]
      }
      person_course_ratings: {
        Args: { p_person_id: string }
        Returns: {
          course_id: string
          course_slug: string
          course_code: string | null
          course_title: string
          review_count: number
          average_rating: number | null
          criteria: Json
        }[]
      }
      person_semester_ratings: {
        Args: { p_person_id: string }
        Returns: {
          semester_id: string
          semester_label: string
          semester_season: Database["public"]["Enums"]["semester_season"]
          semester_year: number
          review_count: number
          average_rating: number | null
        }[]
      }
      person_review_options: {
        Args: { p_person_id: string }
        Returns: {
          course_id: string | null
          course_code: string | null
          course_title: string | null
          semester_id: string
          semester_label: string
          is_assigned: boolean
        }[]
      }
      person_reviews: {
        Args: {
          p_person_id: string
          p_limit?: number
          p_offset?: number
          p_featured_only?: boolean
          p_oldest_first?: boolean
          p_course_id?: string | null
          p_semester_id?: string | null
        }
        Returns: {
          review_id: string
          overall_rating: number
          comment: string | null
          is_featured: boolean
          was_edited: boolean
          course_code: string | null
          course_title: string | null
          semester_label: string | null
          created_at: string
          updated_at: string
          answers: Json
          total_count: number
        }[]
      }
      ranking_min_reviews: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      rankings: {
        Args: {
          p_category: Database["public"]["Enums"]["person_category"]
          p_scope?: string
          p_department_id?: string | null
          p_course_id?: string | null
          p_semester_id?: string | null
          p_limit?: number
        }
        Returns: {
          rank: number
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
        }[]
      }
      recommend_teachers: {
        Args: {
          p_course_id?: string | null
          p_department_id?: string | null
          p_program_id?: string | null
          p_semester_id?: string | null
          p_section?: string | null
          p_category?: Database["public"]["Enums"]["person_category"]
          p_limit?: number
        }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          score: number
          reasons: string[]
          strengths: Json
        }[]
      }
      record_person_view: {
        Args: { p_person_id: string }
        Returns: undefined
      }
      review_limits: {
        Args: Record<PropertyKey, never>
        Returns: {
          max_per_day: number
          max_edits: number
        }[]
      }
      submit_review: {
        Args: {
          p_person_id: string
          p_overall: number
          p_comment: string | null
          p_answers: Json
          p_course_id?: string | null
          p_semester_id?: string | null
        }
        Returns: string
      }
      set_platform_settings: {
        Args: {
          p_ranking_min_reviews?: number | null
          p_breakdown_min_reviews?: number | null
          p_trending_window_days?: number | null
          p_trending_min_reviews?: number | null
        }
        Returns: undefined
      }
      toggle_favorite: {
        Args: { p_person_id: string }
        Returns: boolean
      }
      trending: {
        Args: {
          p_category?: Database["public"]["Enums"]["person_category"] | null
          p_limit?: number
        }
        Returns: {
          person_id: string
          slug: string
          full_name: string
          display_name: string | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          photo_url: string | null
          headline: string | null
          category: Database["public"]["Enums"]["person_category"]
          role_title: string | null
          department_short: string | null
          average_rating: number | null
          review_count: number
          recent_reviews: number
          window_days: number
        }[]
      }
      update_my_review: {
        Args: {
          p_review_id: string
          p_overall: number
          p_comment: string | null
          p_answers: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "admin"
      report_reason:
        | "duplicate_profile"
        | "wrong_information"
        | "incorrect_profile"
        | "other"
      report_status: "pending" | "accepted" | "rejected"
      website_feedback_status: "new" | "reviewing" | "resolved" | "archived"
      website_feedback_type:
        | "website_feedback"
        | "suggest_update"
        | "report_bug"
        | "report_issue"
        | "other"
      notification_priority: "info" | "success" | "warning" | "critical"
      person_category:
        | "teacher"
        | "lab_instructor"
        | "faculty"
        | "university_staff"
        | "hr_staff"
      person_gender: "male" | "female"
      program_level: "undergraduate" | "graduate" | "postgraduate" | "diploma"
      review_criterion_kind: "star" | "yes_no"
      review_moderation_status:
        | "none"
        | "pending"
        | "approved"
        | "rejected"
        | "hidden"
      review_status: "published" | "hidden" | "removed"
      semester_season: "spring" | "summer" | "fall" | "winter"
      teacher_type: "internal" | "external" | "corporate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "admin"],
      report_reason: [
        "duplicate_profile",
        "wrong_information",
        "incorrect_profile",
        "other",
      ],
      report_status: ["pending", "accepted", "rejected"],
      website_feedback_status: ["new", "reviewing", "resolved", "archived"],
      website_feedback_type: [
        "website_feedback",
        "suggest_update",
        "report_bug",
        "report_issue",
        "other",
      ],
      notification_priority: ["info", "success", "warning", "critical"],
      person_category: [
        "teacher",
        "lab_instructor",
        "faculty",
        "university_staff",
        "hr_staff",
      ],
      person_gender: ["male", "female"],
      program_level: ["undergraduate", "graduate", "postgraduate", "diploma"],
      review_criterion_kind: ["star", "yes_no"],
      review_status: ["published", "hidden", "removed"],
      semester_season: ["spring", "summer", "fall", "winter"],
      teacher_type: ["internal", "external", "corporate"],
    },
  },
} as const
