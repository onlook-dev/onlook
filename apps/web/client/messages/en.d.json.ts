// This file is auto-generated by next-intl, do not edit directly.
// See: https://next-intl.dev/docs/workflows/typescript#messages-arguments

declare const messages: {
    "projects": {
        "create": {
            "settings": {
                "title": "Settings",
                "tooltip": "Configure new project settings"
            },
            "success": "Project created successfully.",
            "steps": {
                "count": "{current} of {total}",
                "error": "Project data is missing."
            },
            "methods": {
                "new": "Create New Project",
                "load": "Load Existing Project"
            },
            "loading": {
                "title": "Setting up your new Onlook app...",
                "description": "This may take a few seconds",
                "cancel": "Cancel"
            },
            "error": {
                "title": "Error creating your Onlook app",
                "backToPrompt": "Back to Prompting"
            }
        },
        "select": {
            "empty": "No projects found",
            "sort": {
                "recent": "Recently Updated",
                "name": "Project Name"
            },
            "lastEdited": "Last edited {time} ago"
        },
        "actions": {
            "import": "Import Project",
            "close": "Close",
            "about": "About Onlook",
            "signOut": "Sign out",
            "editApp": "Edit App",
            "projectSettings": "Project settings",
            "showInExplorer": "Show in Explorer",
            "renameProject": "Rename Project",
            "deleteProject": "Delete Project",
            "cancel": "Cancel",
            "delete": "Delete",
            "rename": "Rename",
            "goToAllProjects": "Go to all Projects",
            "newProject": "New Project",
            "startFromScratch": "Start from scratch",
            "importProject": "Import a project",
            "subscriptions": "Subscriptions",
            "settings": "Settings",
            "downloadCode": "Download Code",
            "downloadingCode": "Preparing download...",
            "downloadSuccess": "Download started successfully",
            "downloadError": "Failed to prepare download"
        },
        "dialogs": {
            "delete": {
                "title": "Are you sure you want to delete this project?",
                "description": "This action cannot be undone. This will permanently delete your project and remove all associated data.",
                "moveToTrash": "Also move folder to trash"
            },
            "rename": {
                "title": "Rename Project",
                "label": "Project Name",
                "error": "Project name can't be empty"
            }
        },
        "prompt": {
            "title": "What kind of website do you want to make?",
            "description": "Tell us a bit about your project. Be as detailed as possible.",
            "input": {
                "placeholder": "Paste a reference screenshot, write a novel, get creative...",
                "imageUpload": "Upload Image Reference",
                "fileReference": "File Reference",
                "submit": "Start building your site"
            },
            "blankStart": "Start from a blank page"
        }
    },
    "welcome": {
        "title": "Welcome to Onlook",
        "titleReturn": "Welcome back to Onlook",
        "description": "Onlook is an open-source visual editor for React apps. Design directly in your live product.",
        "alpha": "Alpha",
        "login": {
            "github": "Login with GitHub",
            "google": "Login with Google",
            "lastUsed": "You used this last time",
            "loginToEdit": "Login to Edit",
            "shareProjects": "Share projects, collaborate, and design more in code."
        },
        "terms": {
            "agreement": "By signing up, you agree to our",
            "privacy": "Privacy Policy",
            "and": "and",
            "tos": "Terms of Service"
        },
        "version": "Version {version}"
    },
    "pricing": {
        "plans": {
            "basic": {
                "name": "Basic",
                "price": "$0/month",
                "description": "Prototype and experiment in code with ease.",
                "features": [
                    "Visual code editor access",
                    "Unlimited projects",
                    "{dailyMessages} AI chat messages a day",
                    "{monthlyMessages} AI messages a month",
                    "Limited to 1 screenshot per chat"
                ]
            },
            "pro": {
                "name": "Pro",
                "price": "$20/month",
                "description": "Creativity – unconstrained. Build stunning sites with AI.",
                "features": [
                    "Visual code editor access",
                    "Unlimited projects",
                    "Unlimited AI chat messages a day",
                    "Unlimited monthly chats",
                    "Remove built with Onlook watermark",
                    "1 free custom domain hosted with Onlook",
                    "Priority support"
                ]
            },
            "launch": {
                "name": "Launch",
                "price": "$50/month",
                "description": "Perfect for startups and growing teams",
                "features": [
                    "Unlimited daily messages",
                    "Priority support",
                    "Advanced integrations",
                    "Team collaboration features"
                ]
            },
            "scale": {
                "name": "Scale",
                "price": "$100/month",
                "description": "Enterprise-grade features for large teams",
                "features": [
                    "Everything in Launch plan",
                    "Dedicated account manager",
                    "Custom integrations",
                    "Advanced analytics",
                    "24/7 premium support"
                ]
            }
        },
        "titles": {
            "choosePlan": "Choose your plan",
            "proMember": "Thanks for being a Pro member!"
        },
        "buttons": {
            "currentPlan": "Current Plan",
            "getPro": "Get Pro",
            "manageSubscription": "Manage Subscription"
        },
        "loading": {
            "checkingPayment": "Checking for payment..."
        },
        "toasts": {
            "checkingOut": {
                "title": "Checking out",
                "description": "You will now be redirected to Stripe to complete the payment."
            },
            "redirectingToStripe": {
                "title": "Redirecting to Stripe",
                "description": "You will now be redirected to Stripe to manage your subscription."
            },
            "error": {
                "title": "Error",
                "description": "Could not initiate checkout process. Please try again."
            }
        },
        "footer": {
            "unusedMessages": "Unused chat messages will roll over to the next month."
        }
    },
    "editor": {
        "modes": {
            "design": {
                "name": "Design",
                "description": "Edit and modify your website's design",
                "tooltip": "Switch to design mode"
            },
            "preview": {
                "name": "Preview",
                "description": "Preview and test your website's functionality",
                "tooltip": "Switch to Preview mode"
            }
        },
        "toolbar": {
            "tools": {
                "select": {
                    "name": "Select",
                    "tooltip": "Select and modify elements"
                },
                "pan": {
                    "name": "Pan",
                    "tooltip": "Pan and move around the canvas"
                },
                "insertDiv": {
                    "name": "Insert Container",
                    "tooltip": "Add a new container element"
                },
                "insertText": {
                    "name": "Insert Text",
                    "tooltip": "Add a new text element"
                }
            },
            "versionHistory": "Version History"
        },
        "panels": {
            "edit": {
                "tabs": {
                    "chat": {
                        "name": "Chat",
                        "emptyState": "Select an element to chat with AI",
                        "emptyStateStart": "Start the project to chat",
                        "input": {
                            "placeholder": "Type your message...",
                            "tooltip": "Chat with AI about the selected element"
                        },
                        "mode": {
                            "tooltip": "Switch between Build and Ask modes"
                        },
                        "controls": {
                            "newChat": "New Chat",
                            "history": "Chat History"
                        },
                        "settings": {
                            "showSuggestions": "Show suggestions",
                            "expandCodeBlocks": "Show code while rendering"
                        },
                        "miniChat": {
                            "button": "Chat with AI"
                        }
                    },
                    "styles": {
                        "name": "Styles",
                        "emptyState": "Select an element to edit its style properties",
                        "groups": {
                            "position": "Position & Dimensions",
                            "layout": "Flexbox & Layout",
                            "style": "Styles",
                            "text": "Text"
                        },
                        "tailwind": {
                            "title": "Tailwind Classes",
                            "placeholder": "Add tailwind classes here",
                            "componentClasses": {
                                "title": "Main Component Classes",
                                "tooltip": "Changes apply to component code. This is the default."
                            },
                            "instanceClasses": {
                                "title": "Instance Classes",
                                "tooltip": "Changes apply to instance code."
                            }
                        }
                    }
                }
            },
            "layers": {
                "name": "Layers",
                "tabs": {
                    "layers": "Layers",
                    "pages": "Pages",
                    "components": "Elements",
                    "images": "Images",
                    "windows": {
                        "name": "Windows",
                        "emptyState": "Select a window to edit its settings"
                    },
                    "brand": "Brand",
                    "apps": "Apps"
                }
            }
        },
        "settings": {
            "preferences": {
                "language": "Language",
                "theme": "Theme",
                "deleteWarning": "Delete Warning",
                "analytics": "Analytics",
                "editor": {
                    "ide": "Editor",
                    "shouldWarnDelete": "Warn when deleting elements",
                    "enableAnalytics": "Enable analytics"
                },
                "shortcuts": "Shortcuts"
            }
        },
        "frame": {
            "startDesigning": {
                "prefix": "Press ",
                "action": "Play",
                "suffix": " to start designing your App"
            },
            "playButton": "Play",
            "waitingForApp": "Waiting for the App to start..."
        },
        "runButton": {
            "portInUse": "Port in Use",
            "loading": "Loading",
            "play": "Play",
            "retry": "Retry",
            "stop": "Stop"
        },
        "zoom": {
            "level": "Zoom Level",
            "in": "Zoom In",
            "out": "Zoom Out",
            "fit": "Zoom Fit",
            "reset": "Zoom 100%",
            "double": "Zoom 200%"
        }
    },
    "help": {
        "menu": {
            "reloadOnlook": "Reload Onlook",
            "theme": {
                "title": "Theme",
                "light": "Light",
                "dark": "Dark",
                "system": "System"
            },
            "language": "Language",
            "openSettings": "Open Settings",
            "contactUs": {
                "title": "Contact Us",
                "website": "Website",
                "discord": "Discord",
                "github": "GitHub",
                "email": "Email"
            },
            "reportIssue": "Report Issue",
            "shortcuts": "Shortcuts"
        }
    }
};
export default messages;