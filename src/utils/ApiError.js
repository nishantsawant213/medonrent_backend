class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", error = [], stack = "") {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = error
    }

    toJSON() {
        return {
            statusCode: this.statusCode,
            data: this.data,
            success: this.success,
            message: this.message, // Include the message here
            errors: this.errors
        };
    }
}

export { ApiError }