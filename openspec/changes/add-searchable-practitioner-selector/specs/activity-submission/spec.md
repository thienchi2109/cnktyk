## ADDED Requirements

### Requirement: Searchable Practitioner Selection
The activity submission form for DonVi role SHALL provide a searchable selector for practitioner selection that enables instant filtering and improved visibility of practitioner details.

#### Scenario: Search by practitioner name
- **WHEN** a DonVi user types a practitioner's name (or partial name) into the search input
- **THEN** the practitioner list filters to show only practitioners whose names contain the search term

#### Scenario: Search by practitioner ID
- **WHEN** a DonVi user types a practitioner ID (MaNhanVien) into the search input
- **THEN** the practitioner list filters to show practitioners whose IDs match the search term

#### Scenario: Search by certification number
- **WHEN** a DonVi user types a certification number (SoCCHN) into the search input
- **THEN** the practitioner list filters to show practitioners whose certification numbers match the search term

#### Scenario: Case-insensitive and diacritics-insensitive search
- **WHEN** a user searches with "Nguyen Van A" or "nguyen van a" or "nguyen văn a"
- **THEN** all variations match practitioners named "Nguyễn Văn A" regardless of case or diacritics

#### Scenario: Empty search shows all practitioners
- **WHEN** the search input is empty or cleared
- **THEN** the selector displays all practitioners in the unit sorted alphabetically by name

#### Scenario: No results state
- **WHEN** a search query returns zero matching practitioners
- **THEN** the selector displays an empty state message "Không tìm thấy nhân viên" instead of an empty list

#### Scenario: Search response time
- **WHEN** a user types into the search input with a list of 100+ practitioners
- **THEN** the filtered results appear within 100 milliseconds without perceptible lag

### Requirement: Enhanced Practitioner Display
The practitioner selector SHALL display comprehensive practitioner information to help users distinguish between similar entries and make accurate selections.

#### Scenario: Multi-line practitioner information
- **WHEN** the selector is open and displaying practitioners
- **THEN** each practitioner option shows their full name (bold), position (ChucDanh), and certification number (SoCCHN) in a readable multi-line format

#### Scenario: Missing certification number handling
- **WHEN** a practitioner does not have a certification number (SoCCHN is null)
- **THEN** the option displays their name and position only, without showing a blank certification field

#### Scenario: Visual hierarchy
- **WHEN** viewing practitioner options in the selector
- **THEN** the full name is visually prominent (larger font, bold) and secondary details (position, certification) are styled as supporting text

### Requirement: Keyboard Navigation
The practitioner selector SHALL support comprehensive keyboard navigation to enable efficient selection without requiring a pointing device.

#### Scenario: ArrowDown navigates to next option
- **WHEN** the selector is open and user presses ArrowDown key
- **THEN** focus moves to the next practitioner option in the list

#### Scenario: ArrowUp navigates to previous option
- **WHEN** the selector is open and user presses ArrowUp key
- **THEN** focus moves to the previous practitioner option in the list

#### Scenario: Enter selects focused option
- **WHEN** a practitioner option is focused and user presses Enter key
- **THEN** the practitioner is selected, the selector closes, and the form field is populated with the practitioner's MaNhanVien

#### Scenario: Escape closes selector without selection
- **WHEN** the selector is open and user presses Escape key
- **THEN** the selector closes without changing the current selection

#### Scenario: Type-ahead search focus
- **WHEN** user opens the selector and starts typing
- **THEN** keyboard focus automatically moves to the search input field

#### Scenario: Tab key cycles focus
- **WHEN** the selector is open and user presses Tab key
- **THEN** focus moves to the next interactive element according to standard tab order

### Requirement: Accessibility Compliance
The practitioner selector SHALL meet WCAG 2.1 AA accessibility standards for keyboard navigation, screen reader support, and focus management.

#### Scenario: ARIA role and state attributes
- **WHEN** the selector is rendered
- **THEN** it has appropriate ARIA attributes, aria-expanded reflects open/closed state, and proper dialog semantics

#### Scenario: Selected option announcement
- **WHEN** a practitioner is selected via keyboard or mouse
- **THEN** screen readers announce the selected practitioner's name and position

#### Scenario: Search results announcement
- **WHEN** search filtering updates the visible options
- **THEN** screen readers announce the number of matching results (e.g., "5 kết quả")

#### Scenario: Focus management on open
- **WHEN** the selector opens
- **THEN** keyboard focus moves to the search input and is trapped within the selector until closed

#### Scenario: Focus return on close
- **WHEN** the selector closes via selection, Escape key, or outside click
- **THEN** keyboard focus returns to the selector trigger button

#### Scenario: Reduced motion support
- **WHEN** user has enabled prefers-reduced-motion system preference
- **THEN** selector animations and transitions are disabled or minimized

### Requirement: Performance with Large Lists
The practitioner selector SHALL maintain responsive performance when rendering and filtering lists of 100+ practitioners.

#### Scenario: Efficient rendering
- **WHEN** the selector contains more than 50 practitioners
- **THEN** the component uses efficient rendering techniques (ScrollArea) to handle large lists without performance degradation

#### Scenario: Instant filtering
- **WHEN** a user types into the search input with 200+ practitioners
- **THEN** the filtered results render within 100ms without blocking the UI thread

#### Scenario: Memory efficiency
- **WHEN** the selector is used with the maximum expected practitioner count (500 items)
- **THEN** memory usage remains below 5MB and does not cause memory leaks on repeated open/close cycles

### Requirement: Form Integration
The practitioner selector SHALL integrate seamlessly with React Hook Form validation and maintain existing form submission behavior.

#### Scenario: Controlled value from form state
- **WHEN** the selector is rendered as part of the activity submission form
- **THEN** its selected value is controlled by React Hook Form's form state (watchedValues.MaNhanVien)

#### Scenario: Value change updates form
- **WHEN** a practitioner is selected from the selector
- **THEN** the form's MaNhanVien field is updated via setValue() and triggers validation

#### Scenario: Validation error display
- **WHEN** the form is submitted without selecting a practitioner
- **THEN** the selector displays the validation error message "Vui lòng chọn nhân viên" below the component

#### Scenario: Disabled state
- **WHEN** the form is in a loading or disabled state (e.g., during submission)
- **THEN** the selector is disabled and displays a visual disabled state, preventing interaction

#### Scenario: Preserves existing form logic
- **WHEN** a practitioner is selected and the form is submitted
- **THEN** the submission behavior, validation logic, and API calls remain unchanged from the original Select implementation

### Requirement: Reusable Component API
The PractitionerSelector component SHALL provide a clean, reusable API for use in other contexts beyond the submission form.

#### Scenario: Practitioners prop
- **WHEN** the component is instantiated with a practitioners array
- **THEN** it displays all provided practitioners in the selector without requiring additional configuration

#### Scenario: Value and onValueChange props
- **WHEN** the component receives value and onValueChange props
- **THEN** it operates as a controlled component, allowing parent to manage selected state

#### Scenario: Optional placeholder prop
- **WHEN** the component receives a placeholder prop
- **THEN** the trigger button displays the placeholder text when no practitioner is selected

#### Scenario: Optional error prop
- **WHEN** the component receives an error string prop
- **THEN** it displays the error message below the component with error styling

#### Scenario: TypeScript interface
- **WHEN** developers import the component
- **THEN** TypeScript provides complete type information for all props, including Practitioner interface

### Requirement: Visual Consistency
The practitioner selector SHALL match the existing glassmorphism design system and integrate visually with the activity submission form.

#### Scenario: Glassmorphism styling
- **WHEN** the selector is rendered
- **THEN** it uses glassmorphism effects (backdrop blur, transparency, subtle borders) consistent with other form controls

#### Scenario: Focus states
- **WHEN** the selector receives keyboard focus
- **THEN** it displays a medical-blue focus ring matching other form inputs

#### Scenario: Hover states
- **WHEN** a user hovers over a practitioner option
- **THEN** the option displays a subtle background highlight with smooth transition

#### Scenario: Selected state indicator
- **WHEN** a practitioner is selected in the selector
- **THEN** the selected option displays a checkmark icon and distinct background color

#### Scenario: Spacing and typography
- **WHEN** viewing the selector within the submission form
- **THEN** its spacing, font sizes, and layout match surrounding form fields (input, textarea, select) for visual consistency
