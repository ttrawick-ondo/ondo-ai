MVP vs Production-Ready                                                                                                                                                               
                                                                                                                                                                                        
  MVP (Internal / Early Users)                                                                                                                                                          
                                                                                                                                                                                        
  Core Functionality                                                                                                                                                                    
  - Chat with multiple AI providers works                                                                                                                                               
  - Conversations persist to database                                                                                                                                                   
  - Projects/folders organization                                                                                                                                                       
  - Branching works                                                                                                                                                                     
  - Basic prompt templates                                                                                                                                                              
                                                                                                                                                                                        
  Security                                                                                                                                                                              
  - Okta SSO (single gate, even if basic)                                                                                                                                               
  - API keys in environment variables (not hardcoded)                                                                                                                                   
  - HTTPS everywhere                                                                                                                                                                    
                                                                                                                                                                                        
  Infrastructure                                                                                                                                                                        
  - Single deployment (Vercel/Railway)                                                                                                                                                  
  - Managed database (Supabase/PlanetScale)                                                                                                                                             
  - Manual deploys OK                                                                                                                                                                   
                                                                                                                                                                                        
  Acceptable Gaps                                                                                                                                                                       
  - Hardcoded user-1 OK if behind SSO (all users same tenant)                                                                                                                           
  - No rate limiting (trusted internal users)                                                                                                                                           
  - No spend alerts (monitoring usage manually)                                                                                                                                         
  - Basic error handling                                                                                                                                                                
  - No audit logging                                                                                                                                                                    
                                                                                                                                                                                        
  ---                                                                                                                                                                                   
  Production-Ready (External / Scaled)                                                                                                                                                  
                                                                                                                                                                                        
  Security                                                                                                                                                                              
  - Server-side user identity from session (no user-1)                                                                                                                                  
  - API key scoping per user/workspace                                                                                                                                                  
  - Rate limiting (per-user, global)                                                                                                                                                    
  - Input sanitization / prompt injection protection                                                                                                                                    
  - Secrets manager (not env vars)                                                                                                                                                      
  - Webhook signature verification                                                                                                                                                      
  - Security headers (CSP, HSTS)                                                                                                                                                        
                                                                                                                                                                                        
  Infrastructure                                                                                                                                                                        
  - CI/CD with SAST, secret scanning, dependency checks                                                                                                                                 
  - Staging environment                                                                                                                                                                 
  - WAF / DDoS protection                                                                                                                                                               
  - Auto-scaling                                                                                                                                                                        
  - Database backups with tested restore                                                                                                                                                
                                                                                                                                                                                        
  Observability                                                                                                                                                                         
  - Error tracking (Sentry)                                                                                                                                                             
  - Structured logging                                                                                                                                                                  
  - Cost monitoring with alerts                                                                                                                                                         
  - Usage analytics                                                                                                                                                                     
  - Audit trail for compliance                                                                                                                                                          
                                                                                                                                                                                        
  Reliability                                                                                                                                                                           
  - Graceful degradation when providers fail                                                                                                                                            
  - Request retry with backoff                                                                                                                                                          
  - Health checks                                                                                                                                                                       
  - Defined SLOs                                                                                                                                                                        
                                                                                                                                                                                        
  ---                                                                                                                                                                                   
  Your Current State → MVP Gap                                                                                                                                                          
  ┌──────────────────────┬─────────────┬──────────────┐                                                                                                                                 
  │         Item         │   Status    │ MVP Blocker? │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ Core chat            │ ✅ Done     │ —            │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ Branching            │ ✅ Done     │ —            │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ SSO (Okta)           │ ❌ Missing  │ Yes          │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ Secrets in env       │ ✅ Done     │ —            │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ HTTPS                │ ✅ (Vercel) │ —            │                                                                                                                                 
  ├──────────────────────┼─────────────┼──────────────┤                                                                                                                                 
  │ Basic error handling │ ✅ Done     │ —            │                                                                                                                                 
  └──────────────────────┴─────────────┴──────────────┘                                                                                                                                 
  To reach MVP: Add Okta SSO. Everything else can wait.                                                                                                                                 
                                                                                                                                                                                        
  Want me to look into what adding Okta auth would involve?                                                                                                                             
                                                                                                                                                                                        
❯ Your Current State → MVP Gap: add our curernt model support                                                                                                                           
                                                                                                                                                                                        
⏺ Read(src/lib/api/config/providers.ts)                                                                                                                                                 
  ⎿  Read 281 lines                                                                                                                                                                     
                                                                                                                                                                                        
⏺ Your Current State → MVP Gap                                                                                                                                                          
  ┌────────────────────────────────────────────────────┬───────────────┬──────────────┐                                                                                                 
  │                        Item                        │    Status     │ MVP Blocker? │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Core Features                                      │               │              │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Chat with AI providers                             │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Conversation persistence                           │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Projects/folders                                   │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Branching                                          │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Prompt templates                                   │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Model Support                                      │               │              │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ OpenAI (GPT-4o, GPT-4 Turbo, GPT-4o Mini, GPT-3.5) │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Anthropic (Claude Opus 4, Sonnet 4, Haiku 3.5)     │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Glean Assistant                                    │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Dust Assistant                                     │ ✅ Configured │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ OndoBot                                            │ ✅ Configured │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Vision support                                     │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ File attachments                                   │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Function calling / Tools                           │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Streaming responses                                │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Security                                           │               │              │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ SSO (Okta)                                         │ ❌ Missing    │ Yes          │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Secrets in env vars                                │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ HTTPS                                              │ ✅ (Vercel)   │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Infrastructure                                     │               │              │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Basic error handling                               │ ✅ Done       │ —            │                                                                                                 
  ├────────────────────────────────────────────────────┼───────────────┼──────────────┤                                                                                                 
  │ Database persistence                               │ ✅ Done       │ —            │                                                                                                 
  └────────────────────────────────────────────────────┴───────────────┴──────────────┘                                                                                                 
  To reach MVP: Add Okta SSO. Everything else is in place.                                                                                                                              