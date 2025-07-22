-- Create the fines view
CREATE VIEW UserMonthlyFines AS
SELECT 
    u.name AS user_name,
    DATE_FORMAT(l.return_date, '%Y-%m') AS return_month,
    SUM(
        CASE
            WHEN l.return_date > l.due_date THEN DATEDIFF(l.return_date, l.due_date) * 0.20
            ELSE 0
        END
    ) AS total_fine
FROM Loans l
JOIN Users u ON l.user_id = u.user_id
GROUP BY u.name, return_month;
